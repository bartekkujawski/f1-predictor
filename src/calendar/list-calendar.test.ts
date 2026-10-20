import { describe, expect, it } from "vitest";
import { fixedClock } from "../clock/clock";
import { player } from "../db/schema";
import type { Database } from "../db/database";
import { createTestDatabase } from "../db/test-database";
import { createLeague, joinLeague } from "../league/league";
import { refresh } from "../refresh/refresh";
import { createFakeResultsSource } from "../results-source/fake-results-source";
import type { RaceResults, ScheduledRound } from "../results-source/results-source";
import { type Calendar, listCalendar } from "./list-calendar";

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

const appAdmin = { id: "player-admin", name: "Bartek", email: "admin@example.com", nickname: "Bartek" };
const ania = { id: "player-ania", name: "Anna Nowak", email: "ania@example.com", nickname: "Ania" };
const outsider = { id: "player-ola", name: "Ola Lis", email: "ola@example.com", nickname: "Ola" };

// A database with the 2026 calendar synced the way the App Admin does it, and Ania a Member
// of the League.
const syncedDatabase = async (schedule: ScheduledRound[] = [jeddah, bahrain]) => {
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
      resultsSource: createFakeResultsSource({ 2026: { schedule, regularDrivers: [] } }),
      clock: fixedClock(new Date("2026-01-01T00:00:00Z")),
      appAdminEmails: [appAdmin.email],
    },
    appAdmin.id,
  );
  return db;
};

const at = (iso: string) => fixedClock(new Date(iso));

// The calendar as Ania, a Member, sees it at the given moment.
const memberCalendar = async (db: Database, iso: string): Promise<Calendar> => {
  const outcome = await listCalendar({ db, clock: at(iso) }, ania.id);
  if (outcome.status !== "listed") {
    throw new Error(`Expected the calendar to be listed, got ${outcome.status}.`);
  }
  return outcome.calendar;
};

const statusesOfRound1 = (calendar: Calendar) => calendar.rounds[0].sessions.map((session) => session.status);

// Stores Round 1's results the way the App Admin's refresh does, right after its Race.
const storeRound1Results = (db: Database, raceResults: RaceResults) =>
  refresh(
    {
      db,
      resultsSource: createFakeResultsSource({
        2026: { schedule: [jeddah, bahrain], regularDrivers: [], raceResults: { 1: raceResults } },
      }),
      clock: at("2026-03-08T18:00:00Z"),
      appAdminEmails: [appAdmin.email],
    },
    appAdmin.id,
  );

const raceOrder = ["norris", "piastri", "max_verstappen", "russell", "leclerc", "hamilton", "antonelli", "albon", "sainz", "alonso"];

describe("listCalendar", () => {
  it("asks a Player who is not a Member to join first, and lists nothing", async () => {
    const db = await syncedDatabase();

    const outcome = await listCalendar({ db, clock: at("2026-02-01T00:00:00Z") }, outsider.id);

    expect(outcome).toEqual({ status: "not-a-member" });
  });

  it("lists the current Season's Rounds in calendar order, each with Qualifying then Race", async () => {
    const db = await syncedDatabase();

    const calendar = await memberCalendar(db, "2026-02-01T00:00:00Z");

    expect(calendar.season).toBe(2026);
    expect(calendar.rounds.map(({ number, name }) => ({ number, name }))).toEqual([
      { number: 1, name: "Bahrain Grand Prix" },
      { number: 2, name: "Saudi Arabian Grand Prix" },
    ]);
    expect(calendar.rounds[0].sessions).toEqual([
      { kind: "Qualifying", startsAt: bahrain.qualifyingStartsAt, locksAt: bahrain.qualifyingStartsAt, status: { state: "open" } },
      { kind: "Race", startsAt: bahrain.raceStartsAt, locksAt: bahrain.qualifyingStartsAt, status: { state: "open" } },
    ]);
  });

  it("shows a Session as open right before its Lock", async () => {
    const db = await syncedDatabase();

    const calendar = await memberCalendar(db, "2026-03-07T14:59:59Z");

    expect(statusesOfRound1(calendar)).toEqual([{ state: "open" }, { state: "open" }]);
  });

  it("shows both Sessions as locked from the start of Qualifying", async () => {
    const db = await syncedDatabase();

    const calendar = await memberCalendar(db, "2026-03-07T15:00:00Z");

    expect(statusesOfRound1(calendar)).toEqual([{ state: "locked" }, { state: "locked" }]);
  });

  it("points at the first Round that still has an open Session as the next open Round", async () => {
    const db = await syncedDatabase();

    expect((await memberCalendar(db, "2026-02-01T00:00:00Z")).nextOpenRound).toBe(1);
    expect((await memberCalendar(db, "2026-03-07T15:00:00Z")).nextOpenRound).toBe(2);
  });

  it("has no next open Round once every Session has locked", async () => {
    const db = await syncedDatabase();

    const calendar = await memberCalendar(db, "2026-12-01T00:00:00Z");

    expect(calendar.nextOpenRound).toBeNull();
  });

  it("shows only the Season of the Clock's year", async () => {
    const db = await syncedDatabase();

    const calendar = await memberCalendar(db, "2027-01-10T00:00:00Z");

    expect(calendar).toEqual({ season: 2027, rounds: [], nextOpenRound: null });
  });

  describe("Session status", () => {
    // Round 1 becomes final when Round 2's Qualifying starts.
    const ROUND_1_FINAL = jeddah.qualifyingStartsAt.toISOString();
    const JUST_BEFORE_ROUND_1_FINAL = "2026-03-14T16:59:59Z";

    it("shows a Session waiting for results after its Race as locked", async () => {
      const db = await syncedDatabase();

      const calendar = await memberCalendar(db, "2026-03-08T18:00:00Z");

      expect(statusesOfRound1(calendar)).toEqual([{ state: "locked" }, { state: "locked" }]);
    });

    it("shows a Session as scored, but provisional, once its results are published in a Round that is not final", async () => {
      const db = await syncedDatabase();
      await storeRound1Results(db, { officialClassification: raceOrder, startingGrid: raceOrder });

      const calendar = await memberCalendar(db, JUST_BEFORE_ROUND_1_FINAL);

      expect(statusesOfRound1(calendar)).toEqual([
        { state: "scored", provisional: true },
        { state: "scored", provisional: true },
      ]);
    });

    it("shows a Session as scored, no longer provisional, once its Round is final", async () => {
      const db = await syncedDatabase();
      await storeRound1Results(db, { officialClassification: raceOrder, startingGrid: raceOrder });

      const calendar = await memberCalendar(db, ROUND_1_FINAL);

      expect(statusesOfRound1(calendar)).toEqual([
        { state: "scored", provisional: false },
        { state: "scored", provisional: false },
      ]);
    });

    it("shows a Session with nothing published as cancelled once its Round is final", async () => {
      const db = await syncedDatabase();

      const calendar = await memberCalendar(db, ROUND_1_FINAL);

      expect(statusesOfRound1(calendar)).toEqual([{ state: "cancelled" }, { state: "cancelled" }]);
    });

    it("keeps Qualifying locked after it has run, until the Race results bring the Starting Grid", async () => {
      const db = await syncedDatabase();
      const afterQualifying = "2026-03-07T17:00:00Z";

      expect(statusesOfRound1(await memberCalendar(db, afterQualifying))[0]).toEqual({ state: "locked" });

      await storeRound1Results(db, { officialClassification: raceOrder, startingGrid: raceOrder });

      expect(statusesOfRound1(await memberCalendar(db, JUST_BEFORE_ROUND_1_FINAL))[0]).toEqual({
        state: "scored",
        provisional: true,
      });
    });
  });
});
