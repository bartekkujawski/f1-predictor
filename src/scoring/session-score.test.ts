import { describe, expect, it } from "vitest";
import { scoreSession, type Prediction, type Top10 } from "./session-score";

// All 22 Regular Drivers of 2026, in finishing order of the Round 16 Race (P1 first).
const REGULAR_DRIVERS_2026 = [
  "VER", "ANT", "HAM", "LEC", "HAD", "PIA", "LAW", "ALO", "NOR", "LIN",
  "HUL", "STR", "COL", "BEA", "OCO", "GAS", "SAI", "BOR", "PER", "RUS", "ALB", "BOT",
];

const top10: Top10 = new Map(
  REGULAR_DRIVERS_2026.slice(0, 10).map((driver, index) => [index + 1, driver]),
);

// A Starting Grid Top 10 where pit lane starters left the given slots empty.
// Nobody moves up, so every other driver keeps their number (ADR-0008).
function top10WithEmptySlots(...emptySlots: number[]): Top10 {
  return new Map([...top10].filter(([position]) => !emptySlots.includes(position)));
}

// Drivers who finish outside the Top 10. Picks of them score 0.
const OUTSIDE_TOP_10 = REGULAR_DRIVERS_2026.slice(10);

// A Prediction where only the given positions name Top 10 drivers;
// every other Pick names a different driver outside the Top 10, so it scores 0.
function predictionWith(picks: Record<number, string>): Prediction {
  return OUTSIDE_TOP_10.slice(0, 10).map((filler, index) => picks[index + 1] ?? filler);
}

describe("scoreSession", () => {
  it("scores 25 for a Pick at P2 whose driver finishes P2", () => {
    const prediction = predictionWith({ 2: "ANT" });

    expect(scoreSession("Sprint", top10, prediction)).toEqual({ points: 25, exactHits: 1 });
  });

  it("scores 15 for a Pick at P2 whose driver finishes P4", () => {
    const prediction = predictionWith({ 2: "LEC" });

    expect(scoreSession("Sprint", top10, prediction)).toEqual({ points: 15, exactHits: 0 });
  });

  it("scores 5 for a Pick at P2 whose driver finishes P10", () => {
    const prediction = predictionWith({ 2: "LIN" });

    expect(scoreSession("Sprint", top10, prediction)).toEqual({ points: 5, exactHits: 0 });
  });

  // The rest of the Accuracy Bonus table. A difference of 2 is the P2→P4 example above.
  it.each([
    { driver: "HAM", difference: 1, points: 19 },
    { driver: "HAD", difference: 3, points: 12 },
    { driver: "PIA", difference: 4, points: 10 },
    { driver: "LAW", difference: 5, points: 8 },
    { driver: "ALO", difference: 6, points: 7 },
    { driver: "NOR", difference: 7, points: 6 },
  ])("scores $points for a Pick at P2 off by $difference ($driver)", ({ driver, points }) => {
    const prediction = predictionWith({ 2: driver });

    expect(scoreSession("Sprint", top10, prediction)).toEqual({ points, exactHits: 0 });
  });

  it("scores 0 for a Pick whose driver finishes outside the Top 10 (P14 or DNF)", () => {
    const prediction = predictionWith({ 2: "BEA" });

    expect(scoreSession("Sprint", top10, prediction)).toEqual({ points: 0, exactHits: 0 });
  });

  it("scores 0 for drivers beyond P10 even when given the full classification", () => {
    const fullClassification: Top10 = new Map(
      REGULAR_DRIVERS_2026.map((driver, index) => [index + 1, driver]),
    );
    const prediction = predictionWith({});

    expect(scoreSession("Sprint", fullClassification, prediction)).toEqual({ points: 0, exactHits: 0 });
  });

  it("multiplies Race points by 3", () => {
    const prediction = predictionWith({ 2: "ANT" });

    expect(scoreSession("Race", top10, prediction)).toEqual({ points: 75, exactHits: 1 });
  });

  it("multiplies Qualifying points by 2", () => {
    const prediction = predictionWith({ 2: "ANT" });

    expect(scoreSession("Qualifying", top10, prediction)).toEqual({ points: 50, exactHits: 1 });
  });

  it("adds 50 for a Perfect Top 10 before the multiplier, for a max Race score of 900", () => {
    const perfectPrediction = REGULAR_DRIVERS_2026.slice(0, 10);

    expect(scoreSession("Race", top10, perfectPrediction)).toEqual({ points: 900, exactHits: 10 });
  });

  it("gives a max Qualifying score of 600 for a Perfect Top 10", () => {
    const perfectPrediction = REGULAR_DRIVERS_2026.slice(0, 10);

    expect(scoreSession("Qualifying", top10, perfectPrediction)).toEqual({ points: 600, exactHits: 10 });
  });

  it("gives a max Sprint score of 300 for a Perfect Top 10", () => {
    const perfectPrediction = REGULAR_DRIVERS_2026.slice(0, 10);

    expect(scoreSession("Sprint", top10, perfectPrediction)).toEqual({ points: 300, exactHits: 10 });
  });

  it("gives whole-number points for every Pick, in every Session Kind", () => {
    const sessionKinds = ["Sprint", "Qualifying", "Race"] as const;
    const scores = sessionKinds.flatMap((kind) =>
      Array.from({ length: 10 }, (_, index) => index + 1).flatMap((pickPosition) =>
        REGULAR_DRIVERS_2026.map(
          (driver) => scoreSession(kind, top10, predictionWith({ [pickPosition]: driver })).points,
        ),
      ),
    );

    expect(scores.filter((score) => !Number.isInteger(score))).toEqual([]);
  });

  it("scores 0 when the Player made no Prediction", () => {
    expect(scoreSession("Race", top10, null)).toEqual({ points: 0, exactHits: 0 });
  });

  it("scores 0 for a Cancelled Session, even for a Prediction that would be perfect", () => {
    const perfectPrediction = REGULAR_DRIVERS_2026.slice(0, 10);

    expect(scoreSession("Race", null, perfectPrediction)).toEqual({ points: 0, exactHits: 0 });
  });

  it("scores a Starting Grid with an empty slot as published, with no Perfect Top 10 (Belgium 2021 shape)", () => {
    // LAW qualified P7 and started from the pit lane; slot 7 stays empty.
    const startingGrid = top10WithEmptySlots(7);
    const prediction = REGULAR_DRIVERS_2026.slice(0, 10);

    expect(scoreSession("Qualifying", startingGrid, prediction)).toEqual({ points: 450, exactHits: 9 });
  });

  it("scores a Starting Grid with an empty last slot as published, with no Perfect Top 10 (Miami 2022 shape)", () => {
    // LIN started from the pit lane, so slot 10 stays empty and HUL keeps grid slot 11.
    const startingGrid = top10WithEmptySlots(10);
    const prediction = [...REGULAR_DRIVERS_2026.slice(0, 9), "HUL"];

    expect(scoreSession("Qualifying", startingGrid, prediction)).toEqual({ points: 450, exactHits: 9 });
  });
});
