import { describe, expect, it } from "vitest";
import { fixedClock } from "../clock/clock";
import { player } from "../db/schema";
import { createTestDatabase } from "../db/test-database";
import { refresh } from "../refresh/refresh";
import { createFakeResultsSource } from "../results-source/fake-results-source";
import type { ScheduledRound } from "../results-source/results-source";
import { listCalendar } from "./list-calendar";

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

// A database with the 2026 calendar synced the way the App Admin does it.
const syncedDatabase = async (schedule: ScheduledRound[] = [jeddah, bahrain]) => {
  const db = await createTestDatabase();
  await db.insert(player).values(appAdmin);
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

describe("listCalendar", () => {
  it("lists the current Season's Rounds in calendar order, each with Qualifying then Race", async () => {
    const db = await syncedDatabase();

    const calendar = await listCalendar({ db, clock: at("2026-02-01T00:00:00Z") });

    expect(calendar.season).toBe(2026);
    expect(calendar.rounds.map(({ number, name }) => ({ number, name }))).toEqual([
      { number: 1, name: "Bahrain Grand Prix" },
      { number: 2, name: "Saudi Arabian Grand Prix" },
    ]);
    expect(calendar.rounds[0].sessions).toEqual([
      { kind: "Qualifying", startsAt: bahrain.qualifyingStartsAt, locksAt: bahrain.qualifyingStartsAt, state: "open" },
      { kind: "Race", startsAt: bahrain.raceStartsAt, locksAt: bahrain.qualifyingStartsAt, state: "open" },
    ]);
  });

  it("shows a Session as open right before its Lock", async () => {
    const db = await syncedDatabase();

    const calendar = await listCalendar({ db, clock: at("2026-03-07T14:59:59Z") });

    expect(calendar.rounds[0].sessions.map((session) => session.state)).toEqual(["open", "open"]);
  });

  it("shows both Sessions as locked from the start of Qualifying", async () => {
    const db = await syncedDatabase();

    const calendar = await listCalendar({ db, clock: at("2026-03-07T15:00:00Z") });

    expect(calendar.rounds[0].sessions.map((session) => session.state)).toEqual(["locked", "locked"]);
  });

  it("points at the first Round that still has an open Session as the next open Round", async () => {
    const db = await syncedDatabase();

    expect((await listCalendar({ db, clock: at("2026-02-01T00:00:00Z") })).nextOpenRound).toBe(1);
    expect((await listCalendar({ db, clock: at("2026-03-07T15:00:00Z") })).nextOpenRound).toBe(2);
  });

  it("has no next open Round once every Session has locked", async () => {
    const db = await syncedDatabase();

    const calendar = await listCalendar({ db, clock: at("2026-12-01T00:00:00Z") });

    expect(calendar.nextOpenRound).toBeNull();
  });

  it("shows only the Season of the Clock's year", async () => {
    const db = await syncedDatabase();

    const calendar = await listCalendar({ db, clock: at("2027-01-10T00:00:00Z") });

    expect(calendar).toEqual({ season: 2027, rounds: [], nextOpenRound: null });
  });
});
