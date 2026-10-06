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

    expect(scoreSession("Sprint", top10, prediction)).toEqual({ sessionScore: 25, exactHits: 1 });
  });

  it("scores 15 for a Pick at P2 whose driver finishes P4", () => {
    const prediction = predictionWith({ 2: "LEC" });

    expect(scoreSession("Sprint", top10, prediction)).toEqual({ sessionScore: 15, exactHits: 0 });
  });

  it("scores 5 for a Pick at P2 whose driver finishes P10", () => {
    const prediction = predictionWith({ 2: "LIN" });

    expect(scoreSession("Sprint", top10, prediction)).toEqual({ sessionScore: 5, exactHits: 0 });
  });

  it("scores 19 for a Pick one position off", () => {
    const prediction = predictionWith({ 2: "HAM" });

    expect(scoreSession("Sprint", top10, prediction)).toEqual({ sessionScore: 19, exactHits: 0 });
  });

  it("scores 12 for a Pick three positions off", () => {
    const prediction = predictionWith({ 2: "HAD" });

    expect(scoreSession("Sprint", top10, prediction)).toEqual({ sessionScore: 12, exactHits: 0 });
  });

  it("scores 10 for a Pick four positions off", () => {
    const prediction = predictionWith({ 2: "PIA" });

    expect(scoreSession("Sprint", top10, prediction)).toEqual({ sessionScore: 10, exactHits: 0 });
  });

  it("scores 8 for a Pick five positions off", () => {
    const prediction = predictionWith({ 2: "LAW" });

    expect(scoreSession("Sprint", top10, prediction)).toEqual({ sessionScore: 8, exactHits: 0 });
  });

  it("scores 0 for a Pick whose driver finishes outside the Top 10 (P14 or DNF)", () => {
    const prediction = predictionWith({ 2: "BEA" });

    expect(scoreSession("Sprint", top10, prediction)).toEqual({ sessionScore: 0, exactHits: 0 });
  });
});
