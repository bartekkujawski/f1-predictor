import { describe, expect, it } from "vitest";
import { fixedClock } from "../clock/clock";
import type { Database } from "../db/database";
import { player } from "../db/schema";
import { createTestDatabase } from "../db/test-database";
import { createLeague, joinLeague } from "../league/league";
import { refresh } from "../refresh/refresh";
import { createFakeResultsSource } from "../results-source/fake-results-source";
import type { RegularDriver, ScheduledRound } from "../results-source/results-source";
import { getPlayerPredictions, getSessionPredictions, type RoundPredictions, savePrediction } from "./prediction";

const bahrain: ScheduledRound = {
  season: 2026,
  number: 1,
  name: "Bahrain Grand Prix",
  qualifyingStartsAt: new Date("2026-03-07T15:00:00Z"),
  raceStartsAt: new Date("2026-03-08T15:00:00Z"),
};

const driver = (driverId: string, code: string, name: string): RegularDriver => ({ driverId, code, name });

const regularDrivers: RegularDriver[] = [
  driver("norris", "NOR", "Lando Norris"),
  driver("piastri", "PIA", "Oscar Piastri"),
  driver("max_verstappen", "VER", "Max Verstappen"),
  driver("russell", "RUS", "George Russell"),
  driver("leclerc", "LEC", "Charles Leclerc"),
  driver("hamilton", "HAM", "Lewis Hamilton"),
  driver("antonelli", "ANT", "Andrea Kimi Antonelli"),
  driver("albon", "ALB", "Alexander Albon"),
  driver("sainz", "SAI", "Carlos Sainz"),
  driver("alonso", "ALO", "Fernando Alonso"),
  driver("stroll", "STR", "Lance Stroll"),
  driver("gasly", "GAS", "Pierre Gasly"),
];

const driverIds = regularDrivers.map(({ driverId }) => driverId);
// Two different valid Top 10s.
const topTen = driverIds.slice(0, 10);
const otherTopTen = driverIds.slice(2, 12);

const appAdmin = { id: "player-admin", name: "Bartek", email: "admin@example.com", nickname: "Bartek" };
const ania = { id: "player-ania", name: "Anna Nowak", email: "ania@example.com", nickname: "Ania" };
const outsider = { id: "player-ola", name: "Ola Lis", email: "ola@example.com", nickname: "Ola" };

// Long before the Lock of Round 1.
const BEFORE_LOCK = "2026-03-01T12:00:00Z";

// A database with Round 1 and the Regular Drivers synced, and Ania a Member of the League.
const syncedDatabase = async () => {
  const db = await createTestDatabase();
  await db.insert(player).values([appAdmin, ania, outsider]);
  const created = await createLeague({ db, appAdminEmails: [appAdmin.email] }, appAdmin.id, "Friends League");
  if (created.status !== "created") {
    throw new Error(`Expected the League to be created, got ${created.status}.`);
  }
  await joinLeague({ db }, ania.id, created.league.joinCode);
  await refresh(
    {
      db,
      resultsSource: createFakeResultsSource({ 2026: { schedule: [bahrain], regularDrivers } }),
      clock: fixedClock(new Date("2026-01-01T00:00:00Z")),
      appAdminEmails: [appAdmin.email],
    },
    appAdmin.id,
  );
  return db;
};

const at = (iso: string) => fixedClock(new Date(iso));

// Round 1 as Ania sees it at the given moment.
const aniasRound = async (db: Database, iso: string): Promise<RoundPredictions> => {
  const outcome = await getPlayerPredictions({ db, clock: at(iso) }, ania.id, 1);
  if (outcome.status !== "found") {
    throw new Error(`Expected Round 1 to be found, got ${outcome.status}.`);
  }
  return outcome.round;
};

const predictionOf = (round: RoundPredictions, kind: "Qualifying" | "Race") =>
  round.sessions.find((session) => session.kind === kind)?.prediction;

describe("savePrediction", () => {
  it("saves a Member's Qualifying Prediction, which they see when they come back", async () => {
    const db = await syncedDatabase();

    const outcome = await savePrediction({ db, clock: at(BEFORE_LOCK) }, ania.id, {
      round: 1,
      kind: "Qualifying",
      picks: topTen,
    });

    expect(outcome).toEqual({ status: "saved" });
    expect(predictionOf(await aniasRound(db, BEFORE_LOCK), "Qualifying")).toEqual(topTen);
  });

  it("replaces the Prediction when the Member edits it, and keeps the other Session's Prediction as it was", async () => {
    const db = await syncedDatabase();
    const dependencies = { db, clock: at(BEFORE_LOCK) };
    await savePrediction(dependencies, ania.id, { round: 1, kind: "Qualifying", picks: topTen });
    await savePrediction(dependencies, ania.id, { round: 1, kind: "Race", picks: topTen });

    const outcome = await savePrediction(dependencies, ania.id, { round: 1, kind: "Race", picks: otherTopTen });

    expect(outcome).toEqual({ status: "saved" });
    const round = await aniasRound(db, BEFORE_LOCK);
    expect(predictionOf(round, "Race")).toEqual(otherTopTen);
    expect(predictionOf(round, "Qualifying")).toEqual(topTen);
  });

  it("accepts a save one second before the Lock", async () => {
    const db = await syncedDatabase();

    const outcome = await savePrediction({ db, clock: at("2026-03-07T14:59:59Z") }, ania.id, {
      round: 1,
      kind: "Race",
      picks: topTen,
    });

    expect(outcome).toEqual({ status: "saved" });
  });

  it("refuses a save exactly at the Lock, even for a page opened before it, and keeps the saved Prediction", async () => {
    const db = await syncedDatabase();
    await savePrediction({ db, clock: at(BEFORE_LOCK) }, ania.id, { round: 1, kind: "Race", picks: topTen });

    // The Race locks at the start of Qualifying, not at the start of the Race.
    const outcome = await savePrediction({ db, clock: at("2026-03-07T15:00:00Z") }, ania.id, {
      round: 1,
      kind: "Race",
      picks: otherTopTen,
    });

    expect(outcome).toEqual({ status: "locked" });
    expect(predictionOf(await aniasRound(db, "2026-03-07T15:00:00Z"), "Race")).toEqual(topTen);
  });

  it.each([
    { problem: "fewer than ten Picks", picks: topTen.slice(0, 9), reason: "not-ten-picks" },
    { problem: "more than ten Picks", picks: driverIds.slice(0, 11), reason: "not-ten-picks" },
    { problem: "the same driver twice", picks: [...topTen.slice(0, 9), topTen[0]], reason: "duplicate-driver" },
    {
      problem: "a driver who is not a Regular Driver",
      picks: [...topTen.slice(0, 9), "mick_schumacher"],
      reason: "not-a-regular-driver",
    },
  ])("refuses a Prediction with $problem, and keeps the saved one", async ({ picks, reason }) => {
    const db = await syncedDatabase();
    const dependencies = { db, clock: at(BEFORE_LOCK) };
    await savePrediction(dependencies, ania.id, { round: 1, kind: "Qualifying", picks: topTen });

    const outcome = await savePrediction(dependencies, ania.id, { round: 1, kind: "Qualifying", picks });

    expect(outcome).toEqual({ status: "invalid", reason });
    expect(predictionOf(await aniasRound(db, BEFORE_LOCK), "Qualifying")).toEqual(topTen);
  });

  it("refuses a driver who was a Regular Driver only in an earlier Season", async () => {
    const db = await syncedDatabase();
    await refresh(
      {
        db,
        resultsSource: createFakeResultsSource({
          2025: { schedule: [], regularDrivers: [driver("bortoleto", "BOR", "Gabriel Bortoleto")] },
        }),
        clock: fixedClock(new Date("2025-06-01T00:00:00Z")),
        appAdminEmails: [appAdmin.email],
      },
      appAdmin.id,
    );

    const outcome = await savePrediction({ db, clock: at(BEFORE_LOCK) }, ania.id, {
      round: 1,
      kind: "Race",
      picks: [...topTen.slice(0, 9), "bortoleto"],
    });

    expect(outcome).toEqual({ status: "invalid", reason: "not-a-regular-driver" });
  });

  it("refuses a Player who is not a Member of the League", async () => {
    const db = await syncedDatabase();
    const dependencies = { db, clock: at(BEFORE_LOCK) };

    const outcome = await savePrediction(dependencies, outsider.id, { round: 1, kind: "Race", picks: topTen });

    expect(outcome).toEqual({ status: "not-a-member" });
    expect(await getPlayerPredictions(dependencies, outsider.id, 1)).toEqual({ status: "not-a-member" });
  });

  it("finds no Session in a Round that is not in the current Season's calendar", async () => {
    const db = await syncedDatabase();
    const dependencies = { db, clock: at(BEFORE_LOCK) };

    const outcome = await savePrediction(dependencies, ania.id, { round: 99, kind: "Race", picks: topTen });

    expect(outcome).toEqual({ status: "no-such-session" });
    expect(await getPlayerPredictions(dependencies, ania.id, 99)).toEqual({ status: "no-such-round" });
  });
});

describe("getPlayerPredictions", () => {
  it("shows a Member the Round's open Sessions without Predictions, and the Season's Regular Drivers to pick from", async () => {
    const db = await syncedDatabase();

    const round = await aniasRound(db, BEFORE_LOCK);

    expect(round).toEqual({
      number: 1,
      name: "Bahrain Grand Prix",
      sessions: [
        { kind: "Qualifying", locksAt: bahrain.qualifyingStartsAt, state: "open", prediction: null },
        { kind: "Race", locksAt: bahrain.qualifyingStartsAt, state: "open", prediction: null },
      ],
      regularDrivers: expect.arrayContaining(regularDrivers),
    });
    expect(round.regularDrivers).toHaveLength(regularDrivers.length);
  });

  it("shows a locked Session without a Prediction as locked with no Picks, so the Member knows it scores 0", async () => {
    const db = await syncedDatabase();
    await savePrediction({ db, clock: at(BEFORE_LOCK) }, ania.id, { round: 1, kind: "Race", picks: topTen });

    const round = await aniasRound(db, "2026-03-07T15:00:00Z");

    expect(round.sessions.map(({ kind, state, prediction }) => ({ kind, state, prediction }))).toEqual([
      { kind: "Qualifying", state: "locked", prediction: null },
      { kind: "Race", state: "locked", prediction: topTen },
    ]);
  });

  it("never shows another Player's Prediction", async () => {
    const db = await syncedDatabase();
    await savePrediction({ db, clock: at(BEFORE_LOCK) }, appAdmin.id, { round: 1, kind: "Race", picks: topTen });

    const round = await aniasRound(db, BEFORE_LOCK);

    expect(predictionOf(round, "Race")).toBeNull();
  });
});

describe("getSessionPredictions", () => {
  it("shows the viewer only their own Prediction before the Lock, and nobody else's", async () => {
    const db = await syncedDatabase();
    const dependencies = { db, clock: at(BEFORE_LOCK) };
    await savePrediction(dependencies, ania.id, { round: 1, kind: "Race", picks: topTen });
    await savePrediction(dependencies, appAdmin.id, { round: 1, kind: "Race", picks: otherTopTen });

    const outcome = await getSessionPredictions(dependencies, ania.id, 1, "Race");

    // toEqual fails on any extra field, so the App Admin's Prediction is not in the response at all.
    expect(outcome).toEqual({
      status: "found",
      session: {
        round: { number: 1, name: "Bahrain Grand Prix" },
        kind: "Race",
        locksAt: bahrain.qualifyingStartsAt,
        visible: { state: "open", own: topTen },
        regularDrivers: expect.arrayContaining(regularDrivers),
      },
    });
  });

  it.each([
    { moment: "exactly at the Lock", iso: "2026-03-07T15:00:00Z" },
    { moment: "after the Lock", iso: "2026-03-08T18:00:00Z" },
  ])("shows the viewer every Member's Prediction $moment", async ({ iso }) => {
    const db = await syncedDatabase();
    await savePrediction({ db, clock: at(BEFORE_LOCK) }, ania.id, { round: 1, kind: "Race", picks: topTen });
    await savePrediction({ db, clock: at(BEFORE_LOCK) }, appAdmin.id, { round: 1, kind: "Race", picks: otherTopTen });

    const outcome = await getSessionPredictions({ db, clock: at(iso) }, ania.id, 1, "Race");

    expect(outcome.status === "found" && outcome.session.visible).toEqual({
      state: "locked",
      members: [
        { nickname: "Ania", prediction: topTen },
        { nickname: "Bartek", prediction: otherTopTen },
      ],
    });
  });

  it("lists a Member who did not predict a locked Session as having no Prediction", async () => {
    const db = await syncedDatabase();
    await savePrediction({ db, clock: at(BEFORE_LOCK) }, ania.id, { round: 1, kind: "Race", picks: topTen });

    const outcome = await getSessionPredictions({ db, clock: at("2026-03-07T15:00:00Z") }, ania.id, 1, "Race");

    expect(outcome.status === "found" && outcome.session.visible).toEqual({
      state: "locked",
      members: [
        { nickname: "Ania", prediction: topTen },
        { nickname: "Bartek", prediction: null },
      ],
    });
  });

  it("gives a Player who is not a Member nothing, even after the Lock", async () => {
    const db = await syncedDatabase();
    await savePrediction({ db, clock: at(BEFORE_LOCK) }, ania.id, { round: 1, kind: "Race", picks: topTen });

    const outcome = await getSessionPredictions({ db, clock: at("2026-03-08T18:00:00Z") }, outsider.id, 1, "Race");

    expect(outcome).toEqual({ status: "not-a-member" });
  });

  it("finds no Session in a Round that is not in the current Season's calendar", async () => {
    const db = await syncedDatabase();

    const outcome = await getSessionPredictions({ db, clock: at(BEFORE_LOCK) }, ania.id, 99, "Race");

    expect(outcome).toEqual({ status: "no-such-session" });
  });
});
