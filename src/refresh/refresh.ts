import { type Column, gt, sql } from "drizzle-orm";
import { isAppAdmin } from "../app-admin/app-admin";
import type { Clock } from "../clock/clock";
import type { Database } from "../db/database";
import { regularDriver, round, session } from "../db/schema";
import type { RegularDriver, ResultsSource, ScheduledRound } from "../results-source/results-source";

export type RefreshDependencies = {
  db: Database;
  resultsSource: ResultsSource;
  clock: Clock;
  appAdminEmails: readonly string[];
};

export type RefreshOutcome =
  | { status: "refused" }
  | { status: "synced"; season: number; rounds: number; regularDrivers: number };

// The value the conflicting insert tried to write, for ON CONFLICT DO UPDATE.
const excluded = (column: Column) => sql.raw(`excluded."${column.name}"`);

const saveSchedule = async (db: Database, schedule: ScheduledRound[], now: Date) => {
  if (schedule.length === 0) {
    return;
  }
  const savedRounds = await db
    .insert(round)
    .values(schedule.map(({ season, number, name }) => ({ season, number, name })))
    .onConflictDoUpdate({ target: [round.season, round.number], set: { name: excluded(round.name) } })
    .returning({ id: round.id, number: round.number });

  const roundIdByNumber = new Map(savedRounds.map(({ id, number }) => [number, id]));
  // Both Sessions lock at the start of Qualifying, which sets the grid (CONTEXT.md, "Lock").
  const sessions = schedule.flatMap((scheduled) => {
    const roundId = roundIdByNumber.get(scheduled.number)!;
    const locksAt = scheduled.qualifyingStartsAt;
    return [
      { roundId, kind: "Qualifying" as const, startsAt: scheduled.qualifyingStartsAt, locksAt },
      { roundId, kind: "Race" as const, startsAt: scheduled.raceStartsAt, locksAt },
    ];
  });
  await db
    .insert(session)
    .values(sessions)
    .onConflictDoUpdate({
      target: [session.roundId, session.kind],
      set: { startsAt: excluded(session.startsAt), locksAt: excluded(session.locksAt) },
      // A Session that has locked stays locked: if Qualifying is postponed after it started,
      // moving the Lock later would reopen Predictions that other Members have already seen.
      setWhere: gt(session.locksAt, now),
    });
};

const saveRegularDrivers = async (db: Database, season: number, drivers: RegularDriver[]) => {
  if (drivers.length === 0) {
    return;
  }
  await db
    .insert(regularDriver)
    .values(drivers.map(({ driverId, code, name }) => ({ season, driverId, code, name })))
    .onConflictDoUpdate({
      target: [regularDriver.season, regularDriver.driverId],
      set: { code: excluded(regularDriver.code), name: excluded(regularDriver.name) },
    });
};

// Syncs the current Season's schedule and Regular Drivers from the ResultsSource. Upserts, so
// running it twice changes nothing. Only the App Admin may run it.
export const refresh = async (
  { db, resultsSource, clock, appAdminEmails }: RefreshDependencies,
  playerId: string,
): Promise<RefreshOutcome> => {
  if (!(await isAppAdmin(db, appAdminEmails, playerId))) {
    return { status: "refused" };
  }

  const now = clock.now();
  const season = now.getUTCFullYear();
  const [schedule, drivers] = await Promise.all([
    resultsSource.fetchSchedule(season),
    resultsSource.fetchRegularDrivers(season),
  ]);

  await saveSchedule(db, schedule, now);
  await saveRegularDrivers(db, season, drivers);

  return { status: "synced", season, rounds: schedule.length, regularDrivers: drivers.length };
};
