import { describe, expect, it } from "vitest";
import { fixedClock } from "../clock/clock";
import type { Database } from "../db/database";
import { player } from "../db/schema";
import { createTestDatabase } from "../db/test-database";
import { createLeague, joinLeague } from "../league/league";
import { refresh } from "../refresh/refresh";
import { createFakeResultsSource } from "../results-source/fake-results-source";
import type { RaceResults, RegularDriver, ScheduledRound } from "../results-source/results-source";
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

// The Round after Bahrain. Round 1 becomes final when its Qualifying starts.
const saudiArabia: ScheduledRound = {
  season: 2026,
  number: 2,
  name: "Saudi Arabian Grand Prix",
  qualifyingStartsAt: new Date("2026-03-21T17:00:00Z"),
  raceStartsAt: new Date("2026-03-22T17:00:00Z"),
};

// A database with the given Rounds (Round 1 by default) and the Regular Drivers synced, and Ania a
// Member of the League.
const syncedDatabase = async (schedule: ScheduledRound[] = [bahrain]) => {
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
      resultsSource: createFakeResultsSource({ 2026: { schedule, regularDrivers } }),
      clock: fixedClock(new Date("2026-01-01T00:00:00Z")),
      appAdminEmails: [appAdmin.email],
    },
    appAdmin.id,
  );
  return db;
};

const at = (iso: string) => fixedClock(new Date(iso));

const AFTER_RACE = "2026-03-08T18:00:00Z";

// Stores Round 1's results the way the App Admin's refresh does.
const storeResults = (db: Database, raceResults: RaceResults) =>
  refresh(
    {
      db,
      resultsSource: createFakeResultsSource({ 2026: { schedule: [bahrain], regularDrivers, raceResults: { 1: raceResults } } }),
      clock: at(AFTER_RACE),
      appAdminEmails: [appAdmin.email],
    },
    appAdmin.id,
  );

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
        { kind: "Qualifying", locksAt: bahrain.qualifyingStartsAt, status: { state: "open" }, prediction: null },
        { kind: "Race", locksAt: bahrain.qualifyingStartsAt, status: { state: "open" }, prediction: null },
      ],
      regularDrivers: expect.arrayContaining(regularDrivers),
    });
    expect(round.regularDrivers).toHaveLength(regularDrivers.length);
  });

  it("shows a locked Session without a Prediction as locked with no Picks, so the Member knows it scores 0", async () => {
    const db = await syncedDatabase();
    await savePrediction({ db, clock: at(BEFORE_LOCK) }, ania.id, { round: 1, kind: "Race", picks: topTen });

    const round = await aniasRound(db, "2026-03-07T15:00:00Z");

    expect(round.sessions.map(({ kind, status, prediction }) => ({ kind, status, prediction }))).toEqual([
      { kind: "Qualifying", status: { state: "locked" }, prediction: null },
      { kind: "Race", status: { state: "locked" }, prediction: topTen },
    ]);
  });

  it("shows the Round's Sessions as scored, but provisional, once results are published in a Round that is not final", async () => {
    const db = await syncedDatabase([bahrain, saudiArabia]);
    await storeResults(db, { officialClassification: driverIds, startingGrid: driverIds });

    const round = await aniasRound(db, AFTER_RACE);

    expect(round.sessions.map(({ status }) => status)).toEqual([
      { state: "scored", provisional: true },
      { state: "scored", provisional: true },
    ]);
  });

  it("shows the Round's Sessions as cancelled once the Round is final with nothing published", async () => {
    const db = await syncedDatabase([bahrain, saudiArabia]);

    const round = await aniasRound(db, saudiArabia.qualifyingStartsAt.toISOString());

    expect(round.sessions.map(({ status }) => status)).toEqual([{ state: "cancelled" }, { state: "cancelled" }]);
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
        scoredAgainst: "Official Classification",
        top10: { state: "not-published-yet" },
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
        { nickname: "Ania", prediction: topTen, score: null },
        { nickname: "Bartek", prediction: otherTopTen, score: null },
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
        { nickname: "Ania", prediction: topTen, score: null },
        { nickname: "Bartek", prediction: null, score: null },
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

  const sessionAfterRace = async (db: Database, kind: "Qualifying" | "Race") => {
    const outcome = await getSessionPredictions({ db, clock: at(AFTER_RACE) }, ania.id, 1, kind);
    if (outcome.status !== "found") {
      throw new Error(`Expected the Session to be found, got ${outcome.status}.`);
    }
    return outcome.session;
  };

  describe("Top 10", () => {
    const top10Of = async (db: Database, kind: "Qualifying" | "Race") => (await sessionAfterRace(db, kind)).top10;

    it("scores Qualifying against the Starting Grid and the Race against its Official Classification", async () => {
      const db = await syncedDatabase();

      expect((await sessionAfterRace(db, "Qualifying")).scoredAgainst).toBe("Starting Grid");
      expect((await sessionAfterRace(db, "Race")).scoredAgainst).toBe("Official Classification");
    });

    it("has no Top 10 until results are stored", async () => {
      const db = await syncedDatabase();

      expect(await top10Of(db, "Race")).toEqual({ state: "not-published-yet" });
      expect(await top10Of(db, "Qualifying")).toEqual({ state: "not-published-yet" });
    });

    it("shows positions 1–10 of the Race's Official Classification", async () => {
      const db = await syncedDatabase();
      await storeResults(db, { officialClassification: driverIds, startingGrid: driverIds });

      expect(await top10Of(db, "Race")).toEqual({ state: "published", order: driverIds.slice(0, 10) });
    });

    it("shows the Starting Grid for Qualifying, with an empty slot kept empty", async () => {
      const db = await syncedDatabase();
      const grid = [...driverIds.slice(0, 6), null, ...driverIds.slice(6, 11)];
      await storeResults(db, { officialClassification: driverIds, startingGrid: grid });

      expect(await top10Of(db, "Qualifying")).toEqual({
        state: "published",
        order: [...driverIds.slice(0, 6), null, ...driverIds.slice(6, 9)],
      });
    });
  });

  describe("Session Scores", () => {
    const predictBoth = async (db: Database, kind: "Qualifying" | "Race") => {
      await savePrediction({ db, clock: at(BEFORE_LOCK) }, ania.id, { round: 1, kind, picks: topTen });
      await savePrediction({ db, clock: at(BEFORE_LOCK) }, appAdmin.id, { round: 1, kind, picks: otherTopTen });
    };

    const scoresOf = async (db: Database, kind: "Qualifying" | "Race") => {
      const { visible } = await sessionAfterRace(db, kind);
      if (visible.state !== "locked") {
        throw new Error("Expected the Session to be locked.");
      }
      return visible.members.map(({ nickname, score }) => ({ nickname, score }));
    };

    it("scores every Member's Race Prediction against the Official Classification", async () => {
      const db = await syncedDatabase();
      await predictBoth(db, "Race");
      // The Starting Grid differs, so a score against it would differ too.
      await storeResults(db, { officialClassification: driverIds, startingGrid: otherTopTen });

      expect(await scoresOf(db, "Race")).toEqual([
        // A Perfect Top 10: ten Exact Hits of 25 points, plus 50, times the Race's 3.
        { nickname: "Ania", score: { points: (10 * 25 + 50) * 3, exactHits: 10 } },
        // Picks 1–8 are each two places off the Top 10 (5 + 10 points), and 9–10 are outside it.
        { nickname: "Bartek", score: { points: 8 * 15 * 3, exactHits: 0 } },
      ]);
    });

    it("scores Qualifying against the Starting Grid, not the Official Classification", async () => {
      const db = await syncedDatabase();
      await predictBoth(db, "Qualifying");
      await storeResults(db, { officialClassification: driverIds, startingGrid: otherTopTen });

      expect(await scoresOf(db, "Qualifying")).toEqual([
        // Ania's Picks 1–8 are each two places off the grid (5 + 10), and 9–10 are outside it.
        { nickname: "Ania", score: { points: 8 * 15 * 2, exactHits: 0 } },
        { nickname: "Bartek", score: { points: (10 * 25 + 50) * 2, exactHits: 10 } },
      ]);
    });

    it("scores against grid numbers as published, so an empty slot stays empty", async () => {
      const db = await syncedDatabase();
      await predictBoth(db, "Qualifying");
      const grid = [...driverIds.slice(0, 6), null, ...driverIds.slice(6, 11)];
      await storeResults(db, { officialClassification: driverIds, startingGrid: grid });

      // Picks 1–6 are Exact Hits (25), 7–9 are one place off (5 + 14), and Pick 10 started 11th.
      expect((await scoresOf(db, "Qualifying"))[0]).toEqual({
        nickname: "Ania",
        score: { points: (6 * 25 + 3 * 19) * 2, exactHits: 6 },
      });
    });

    it("gives a Member without a Prediction 0 once results are in", async () => {
      const db = await syncedDatabase();
      await savePrediction({ db, clock: at(BEFORE_LOCK) }, ania.id, { round: 1, kind: "Race", picks: topTen });
      await storeResults(db, { officialClassification: driverIds, startingGrid: driverIds });

      expect((await scoresOf(db, "Race"))[1]).toEqual({ nickname: "Bartek", score: { points: 0, exactHits: 0 } });
    });

    it("has no Session Scores until what the Session is scored against is published", async () => {
      const db = await syncedDatabase();
      await predictBoth(db, "Qualifying");
      await predictBoth(db, "Race");

      expect((await scoresOf(db, "Qualifying")).map(({ score }) => score)).toEqual([null, null]);
      expect((await scoresOf(db, "Race")).map(({ score }) => score)).toEqual([null, null]);
    });

    it("changes the Session Scores when a refresh changes the results of a Round that is not final", async () => {
      const db = await syncedDatabase();
      await predictBoth(db, "Race");
      await storeResults(db, { officialClassification: driverIds, startingGrid: driverIds });

      // A post-race penalty reorders the Official Classification.
      await storeResults(db, { officialClassification: otherTopTen, startingGrid: driverIds });

      expect(await scoresOf(db, "Race")).toEqual([
        { nickname: "Ania", score: { points: 8 * 15 * 3, exactHits: 0 } },
        { nickname: "Bartek", score: { points: (10 * 25 + 50) * 3, exactHits: 10 } },
      ]);
    });
  });

  describe("Cancelled Session", () => {
    const ROUND_1_FINAL = saudiArabia.qualifyingStartsAt.toISOString();
    const JUST_BEFORE_ROUND_1_FINAL = "2026-03-21T16:59:59Z";

    const sessionAt = async (db: Database, iso: string, kind: "Qualifying" | "Race") => {
      const outcome = await getSessionPredictions({ db, clock: at(iso) }, ania.id, 1, kind);
      if (outcome.status !== "found") {
        throw new Error(`Expected the Session to be found, got ${outcome.status}.`);
      }
      return outcome.session;
    };

    // Ania predicted, the App Admin did not.
    const predictAsAnia = (db: Database, kind: "Qualifying" | "Race") =>
      savePrediction({ db, clock: at(BEFORE_LOCK) }, ania.id, { round: 1, kind, picks: topTen });

    it.each([
      { case: "a Qualifying whose Race was cancelled, so it has no Starting Grid", kind: "Qualifying" as const },
      { case: "a Race without an Official Classification", kind: "Race" as const },
    ])("cancels $case once the Round is final, and gives every Member 0", async ({ kind }) => {
      const db = await syncedDatabase([bahrain, saudiArabia]);
      await predictAsAnia(db, kind);

      const session = await sessionAt(db, ROUND_1_FINAL, kind);

      expect(session.top10).toEqual({ state: "cancelled" });
      expect(session.visible).toEqual({
        state: "locked",
        members: [
          { nickname: "Ania", prediction: topTen, score: { points: 0, exactHits: 0 } },
          { nickname: "Bartek", prediction: null, score: { points: 0, exactHits: 0 } },
        ],
      });
    });

    it.each(["Qualifying" as const, "Race" as const])(
      "keeps waiting for the results of a %s in a Round that is not final yet, with no scores",
      async (kind) => {
        const db = await syncedDatabase([bahrain, saudiArabia]);
        await predictAsAnia(db, kind);

        const session = await sessionAt(db, JUST_BEFORE_ROUND_1_FINAL, kind);

        expect(session.top10).toEqual({ state: "not-published-yet" });
        expect(session.visible).toEqual({
          state: "locked",
          members: [
            { nickname: "Ania", prediction: topTen, score: null },
            { nickname: "Bartek", prediction: null, score: null },
          ],
        });
      },
    );

    it("does not cancel a Session of a Final Round that has its results", async () => {
      const db = await syncedDatabase([bahrain, saudiArabia]);
      await predictAsAnia(db, "Race");
      await storeResults(db, { officialClassification: driverIds, startingGrid: driverIds });

      const session = await sessionAt(db, ROUND_1_FINAL, "Race");

      expect(session.top10.state).toBe("published");
      expect(session.visible.state === "locked" && session.visible.members[0].score).toEqual({
        points: (10 * 25 + 50) * 3,
        exactHits: 10,
      });
    });

    it("never cancels a Session of the last Round of the Season, which has no next Round", async () => {
      const db = await syncedDatabase();

      expect((await sessionAt(db, "2026-12-31T23:59:59Z", "Race")).top10).toEqual({ state: "not-published-yet" });
    });
  });
});
