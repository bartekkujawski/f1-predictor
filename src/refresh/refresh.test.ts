import { asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { fixedClock } from "../clock/clock";
import type { Database } from "../db/database";
import { player, regularDriver, round, session } from "../db/schema";
import { createTestDatabase } from "../db/test-database";
import { createFakeResultsSource } from "../results-source/fake-results-source";
import type { ResultsSource, ScheduledRound } from "../results-source/results-source";
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
});
