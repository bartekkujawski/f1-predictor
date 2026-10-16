import { asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { fixedClock } from "../clock/clock";
import type { Database } from "../db/database";
import { player, regularDriver, round, session } from "../db/schema";
import { createTestDatabase } from "../db/test-database";
import { createFakeResultsSource } from "../results-source/fake-results-source";
import type { RaceResults, ResultsSource, ScheduledRound } from "../results-source/results-source";
import { refresh } from "./refresh";

const bahrain: ScheduledRound = {
  season: 2026,
  number: 1,
  name: "Bahrain Grand Prix",
  qualifyingStartsAt: new Date("2026-03-07T15:00:00Z"),
  raceStartsAt: new Date("2026-03-08T15:00:00Z"),
};

const jeddah: ScheduledRound = {
  season: 2026,
  number: 2,
  name: "Saudi Arabian Grand Prix",
  qualifyingStartsAt: new Date("2026-03-14T17:00:00Z"),
  raceStartsAt: new Date("2026-03-15T17:00:00Z"),
};

const regularDrivers = [
  { driverId: "max_verstappen", code: "VER", name: "Max Verstappen" },
  { driverId: "norris", code: "NOR", name: "Lando Norris" },
];

const source2026 = createFakeResultsSource({ 2026: { schedule: [bahrain, jeddah], regularDrivers } });

const bahrainResults: RaceResults = {
  officialClassification: ["norris", "max_verstappen"],
  // Slot 1 left empty by a pit lane starter.
  startingGrid: [null, "max_verstappen", "norris"],
};

// After Bahrain's Race, before Jeddah's Qualifying: Round 1 is not final yet.
const AFTER_BAHRAIN = new Date("2026-03-09T12:00:00Z");
// Jeddah's Qualifying has started, so Round 1 is final.
const DURING_JEDDAH = new Date("2026-03-14T18:00:00Z");

const withResults = (raceResults: Record<number, RaceResults>) =>
  createFakeResultsSource({ 2026: { schedule: [bahrain, jeddah], regularDrivers, raceResults } });

const appAdmin = { id: "player-admin", name: "Bartek", email: "admin@example.com", nickname: "Bartek" };
const ania = { id: "player-ania", name: "Anna Nowak", email: "ania@example.com", nickname: "Ania" };

const setUp = async (resultsSource: ResultsSource = source2026) => {
  const db = await createTestDatabase();
  await db.insert(player).values([appAdmin, ania]);
  const dependencies = {
    db,
    resultsSource,
    clock: fixedClock(new Date("2026-02-01T12:00:00Z")),
    appAdminEmails: ["admin@example.com"],
  };
  return { db, dependencies };
};

const storedResults = (db: Database) =>
  db
    .select({
      round: round.number,
      kind: session.kind,
      officialClassification: session.officialClassification,
      startingGrid: session.startingGrid,
    })
    .from(session)
    .innerJoin(round, eq(session.roundId, round.id))
    .orderBy(asc(round.number), asc(session.startsAt));

const storedSessions = (db: Database) =>
  db
    .select({ round: round.number, kind: session.kind, startsAt: session.startsAt, locksAt: session.locksAt })
    .from(session)
    .innerJoin(round, eq(session.roundId, round.id))
    .orderBy(asc(round.number), asc(session.startsAt));

describe("refresh", () => {
  it("refuses a Player who is not the App Admin, and stores nothing", async () => {
    const { db, dependencies } = await setUp();

    const outcome = await refresh(dependencies, ania.id);

    expect(outcome).toEqual({ status: "refused" });
    expect(await db.select().from(round)).toEqual([]);
    expect(await db.select().from(regularDriver)).toEqual([]);
  });

  it("refuses an unknown Player", async () => {
    const { dependencies } = await setUp();

    expect(await refresh(dependencies, "player-nobody")).toEqual({ status: "refused" });
  });

  it("stores the current Season's Rounds", async () => {
    const { db, dependencies } = await setUp();

    await refresh(dependencies, appAdmin.id);

    const rounds = await db
      .select({ season: round.season, number: round.number, name: round.name })
      .from(round)
      .orderBy(asc(round.number));
    expect(rounds).toEqual([
      { season: 2026, number: 1, name: "Bahrain Grand Prix" },
      { season: 2026, number: 2, name: "Saudi Arabian Grand Prix" },
    ]);
  });

  it("stores Qualifying and Race for each Round, both locking at the Qualifying start", async () => {
    const { db, dependencies } = await setUp();

    await refresh(dependencies, appAdmin.id);

    expect(await storedSessions(db)).toEqual([
      { round: 1, kind: "Qualifying", startsAt: bahrain.qualifyingStartsAt, locksAt: bahrain.qualifyingStartsAt },
      { round: 1, kind: "Race", startsAt: bahrain.raceStartsAt, locksAt: bahrain.qualifyingStartsAt },
      { round: 2, kind: "Qualifying", startsAt: jeddah.qualifyingStartsAt, locksAt: jeddah.qualifyingStartsAt },
      { round: 2, kind: "Race", startsAt: jeddah.raceStartsAt, locksAt: jeddah.qualifyingStartsAt },
    ]);
  });

  it("stores the Season's Regular Drivers", async () => {
    const { db, dependencies } = await setUp();

    await refresh(dependencies, appAdmin.id);

    const stored = await db
      .select({ season: regularDriver.season, driverId: regularDriver.driverId, code: regularDriver.code })
      .from(regularDriver)
      .orderBy(asc(regularDriver.code));
    expect(stored).toEqual([
      { season: 2026, driverId: "norris", code: "NOR" },
      { season: 2026, driverId: "max_verstappen", code: "VER" },
    ]);
  });

  it("reports what it synced", async () => {
    const { dependencies } = await setUp();

    expect(await refresh(dependencies, appAdmin.id)).toEqual({
      status: "synced",
      season: 2026,
      rounds: 2,
      regularDrivers: 2,
      updated: [],
      unchanged: [],
      waiting: [],
      errors: [],
    });
  });

  it("creates no duplicates when run twice", async () => {
    const { db, dependencies } = await setUp();

    await refresh(dependencies, appAdmin.id);
    await refresh(dependencies, appAdmin.id);

    expect(await db.select().from(round)).toHaveLength(2);
    expect(await db.select().from(session)).toHaveLength(4);
    expect(await db.select().from(regularDriver)).toHaveLength(2);
  });

  it("updates a Round whose times changed since the last refresh", async () => {
    const qualifyingMovedBy1Hour = new Date("2026-03-07T16:00:00Z");
    const moved = createFakeResultsSource({
      2026: { schedule: [{ ...bahrain, qualifyingStartsAt: qualifyingMovedBy1Hour }, jeddah], regularDrivers },
    });
    const { db, dependencies } = await setUp();

    await refresh(dependencies, appAdmin.id);
    await refresh({ ...dependencies, resultsSource: moved }, appAdmin.id);

    const [qualifying, race] = await storedSessions(db);
    expect(qualifying.locksAt).toEqual(qualifyingMovedBy1Hour);
    expect(race.locksAt).toEqual(qualifyingMovedBy1Hour);
  });

  it("never moves a Lock that has already passed, so a locked Session stays locked", async () => {
    const postponed = createFakeResultsSource({
      2026: { schedule: [{ ...bahrain, qualifyingStartsAt: new Date("2026-03-08T11:00:00Z") }, jeddah], regularDrivers },
    });
    const { db, dependencies } = await setUp();
    await refresh(dependencies, appAdmin.id);

    const afterTheLock = fixedClock(new Date("2026-03-07T16:00:00Z"));
    await refresh({ ...dependencies, resultsSource: postponed, clock: afterTheLock }, appAdmin.id);

    const [qualifying, race] = await storedSessions(db);
    expect(qualifying.locksAt).toEqual(bahrain.qualifyingStartsAt);
    expect(race.locksAt).toEqual(bahrain.qualifyingStartsAt);
  });

  it("recognises the App Admin's email regardless of letter case", async () => {
    const { dependencies } = await setUp();

    const outcome = await refresh({ ...dependencies, appAdminEmails: ["Admin@Example.com"] }, appAdmin.id);

    expect(outcome.status).toBe("synced");
  });

  it("syncs the Season of the Clock's year", async () => {
    const source = createFakeResultsSource({
      2026: { schedule: [bahrain], regularDrivers },
      2027: { schedule: [{ ...bahrain, season: 2027 }], regularDrivers: [] },
    });
    const { db, dependencies } = await setUp(source);

    await refresh({ ...dependencies, clock: fixedClock(new Date("2027-01-10T00:00:00Z")) }, appAdmin.id);

    expect(await db.select({ season: round.season }).from(round)).toEqual([{ season: 2027 }]);
  });

  describe("results", () => {
    it("stores the Race's Official Classification, and the Starting Grid on Qualifying", async () => {
      const { db, dependencies } = await setUp(withResults({ 1: bahrainResults }));

      await refresh({ ...dependencies, clock: fixedClock(AFTER_BAHRAIN) }, appAdmin.id);

      expect(await storedResults(db)).toEqual([
        { round: 1, kind: "Qualifying", officialClassification: null, startingGrid: [null, "max_verstappen", "norris"] },
        { round: 1, kind: "Race", officialClassification: ["norris", "max_verstappen"], startingGrid: null },
        { round: 2, kind: "Qualifying", officialClassification: null, startingGrid: null },
        { round: 2, kind: "Race", officialClassification: null, startingGrid: null },
      ]);
    });

    it("replaces results that changed since the last refresh, e.g. after a post-race penalty", async () => {
      const penalised: RaceResults = { ...bahrainResults, officialClassification: ["max_verstappen", "norris"] };
      const { db, dependencies } = await setUp(withResults({ 1: bahrainResults }));
      const clock = fixedClock(AFTER_BAHRAIN);

      await refresh({ ...dependencies, clock }, appAdmin.id);
      await refresh({ ...dependencies, clock, resultsSource: withResults({ 1: penalised }) }, appAdmin.id);

      const [, race] = await storedResults(db);
      expect(race.officialClassification).toEqual(["max_verstappen", "norris"]);
    });

    it("never changes the results of a Final Round", async () => {
      const penalised: RaceResults = { officialClassification: ["max_verstappen"], startingGrid: ["norris"] };
      const { db, dependencies } = await setUp(withResults({ 1: bahrainResults }));
      await refresh({ ...dependencies, clock: fixedClock(AFTER_BAHRAIN) }, appAdmin.id);

      await refresh(
        { ...dependencies, clock: fixedClock(DURING_JEDDAH), resultsSource: withResults({ 1: penalised }) },
        appAdmin.id,
      );

      const [qualifying, race] = await storedResults(db);
      expect(qualifying.startingGrid).toEqual(bahrainResults.startingGrid);
      expect(race.officialClassification).toEqual(bahrainResults.officialClassification);
    });

    it("stores nothing for a Round that became final before its results were stored", async () => {
      const { db, dependencies } = await setUp(withResults({ 1: bahrainResults }));

      await refresh({ ...dependencies, clock: fixedClock(DURING_JEDDAH) }, appAdmin.id);

      const [qualifying, race] = await storedResults(db);
      expect(qualifying.startingGrid).toBeNull();
      expect(race.officialClassification).toBeNull();
    });

    it("is harmless when run twice", async () => {
      const { db, dependencies } = await setUp(withResults({ 1: bahrainResults }));
      const clock = fixedClock(AFTER_BAHRAIN);

      await refresh({ ...dependencies, clock }, appAdmin.id);
      const once = await storedResults(db);
      await refresh({ ...dependencies, clock }, appAdmin.id);

      expect(await storedResults(db)).toEqual(once);
    });

    it("reports the Sessions whose results it stored", async () => {
      const { dependencies } = await setUp(withResults({ 1: bahrainResults }));

      const outcome = await refresh({ ...dependencies, clock: fixedClock(AFTER_BAHRAIN) }, appAdmin.id);

      expect(outcome).toMatchObject({
        updated: [
          { round: 1, kind: "Qualifying" },
          { round: 1, kind: "Race" },
        ],
        waiting: [],
        errors: [],
      });
    });

    it("reports results that are the same as the stored ones as unchanged, and does not count them as updated", async () => {
      const { dependencies } = await setUp(withResults({ 1: bahrainResults }));
      const clock = fixedClock(AFTER_BAHRAIN);
      await refresh({ ...dependencies, clock }, appAdmin.id);

      const outcome = await refresh({ ...dependencies, clock }, appAdmin.id);

      expect(outcome).toMatchObject({
        updated: [],
        unchanged: [
          { round: 1, kind: "Qualifying" },
          { round: 1, kind: "Race" },
        ],
      });
    });

    it("reports only the Session whose order a post-race penalty changed as updated", async () => {
      const penalised: RaceResults = { ...bahrainResults, officialClassification: ["max_verstappen", "norris"] };
      const { dependencies } = await setUp(withResults({ 1: bahrainResults }));
      const clock = fixedClock(AFTER_BAHRAIN);
      await refresh({ ...dependencies, clock }, appAdmin.id);

      const outcome = await refresh({ ...dependencies, clock, resultsSource: withResults({ 1: penalised }) }, appAdmin.id);

      expect(outcome).toMatchObject({
        updated: [{ round: 1, kind: "Race" }],
        unchanged: [{ round: 1, kind: "Qualifying" }],
      });
    });

    it("reports the Sessions that have started and are still waiting for results", async () => {
      const { dependencies } = await setUp();

      const outcome = await refresh({ ...dependencies, clock: fixedClock(AFTER_BAHRAIN) }, appAdmin.id);

      expect(outcome).toMatchObject({
        updated: [],
        waiting: [
          { round: 1, kind: "Qualifying" },
          { round: 1, kind: "Race" },
        ],
      });
    });

    it("reports Qualifying as waiting between Qualifying and the Race, since the grid comes with the Race", async () => {
      const { dependencies } = await setUp(withResults({ 1: bahrainResults }));

      const betweenQualifyingAndRace = fixedClock(new Date("2026-03-07T18:00:00Z"));
      const outcome = await refresh({ ...dependencies, clock: betweenQualifyingAndRace }, appAdmin.id);

      expect(outcome).toMatchObject({ updated: [], waiting: [{ round: 1, kind: "Qualifying" }] });
    });

    it("reports a failure to fetch a Round's results instead of failing the whole refresh", async () => {
      const failing: ResultsSource = {
        ...withResults({}),
        fetchRaceResults: async () => {
          throw new Error("Jolpica answered 503");
        },
      };
      const { db, dependencies } = await setUp(failing);

      const outcome = await refresh({ ...dependencies, clock: fixedClock(AFTER_BAHRAIN) }, appAdmin.id);

      expect(outcome).toMatchObject({ status: "synced", rounds: 2, updated: [], waiting: [] });
      expect(outcome.status === "synced" && outcome.errors).toEqual(["Round 1 results: Jolpica answered 503"]);
      expect(await db.select().from(round)).toHaveLength(2);
    });

    it("still refreshes results of stored Rounds when the schedule cannot be fetched", async () => {
      const { db, dependencies } = await setUp(withResults({ 1: bahrainResults }));
      await refresh(dependencies, appAdmin.id);
      const scheduleDown: ResultsSource = {
        ...withResults({ 1: bahrainResults }),
        fetchSchedule: async () => {
          throw new Error("Could not reach Jolpica");
        },
      };

      const outcome = await refresh(
        { ...dependencies, resultsSource: scheduleDown, clock: fixedClock(AFTER_BAHRAIN) },
        appAdmin.id,
      );

      expect(outcome).toMatchObject({ errors: ["Schedule and Regular Drivers: Could not reach Jolpica"] });
      const [, race] = await storedResults(db);
      expect(race.officialClassification).toEqual(bahrainResults.officialClassification);
    });
  });
});
