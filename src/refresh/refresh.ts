import { type Column, and, asc, eq, gt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { isAppAdmin } from "../app-admin/app-admin";
import type { SessionKind } from "../calendar/session";
import type { Clock } from "../clock/clock";
import type { Database } from "../db/database";
import { regularDriver, round, session } from "../db/schema";
import type { RaceResults, RegularDriver, ResultsSource, ScheduledRound } from "../results-source/results-source";

export type RefreshDependencies = {
  db: Database;
  resultsSource: ResultsSource;
  clock: Clock;
  appAdminEmails: readonly string[];
};

export type SessionRef = { round: number; kind: SessionKind };

// What the refresh did, for the App Admin.
export type RefreshOutcome =
  | { status: "refused" }
  | {
      status: "synced";
      season: number;
      rounds: number;
      regularDrivers: number;
      // Sessions whose results this refresh stored.
      updated: SessionRef[];
      // Sessions that have started, in Rounds not yet final, for which the source has no results yet.
      waiting: SessionRef[];
      // Failures of the ResultsSource. Everything else in the refresh still ran.
      errors: string[];
    };

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

// The Rounds of the Season in calendar order, each with its Qualifying and Race.
const listRounds = (db: Database, season: number) => {
  const qualifying = alias(session, "qualifying");
  const race = alias(session, "race");
  return db
    .select({
      number: round.number,
      qualifyingId: qualifying.id,
      qualifyingStartsAt: qualifying.startsAt,
      raceId: race.id,
      raceStartsAt: race.startsAt,
    })
    .from(round)
    .innerJoin(qualifying, and(eq(qualifying.roundId, round.id), eq(qualifying.kind, "Qualifying")))
    .innerJoin(race, and(eq(race.roundId, round.id), eq(race.kind, "Race")))
    .where(eq(round.season, season))
    .orderBy(asc(round.number));
};

const saveRaceResults = async (db: Database, qualifyingId: number, raceId: number, results: RaceResults) => {
  await db
    .update(session)
    .set({ officialClassification: [...results.officialClassification] })
    .where(eq(session.id, raceId));
  await db
    .update(session)
    .set({ startingGrid: [...results.startingGrid] })
    .where(eq(session.id, qualifyingId));
};

const describeFailure = (error: unknown): string => (error instanceof Error ? error.message : String(error));

// Fetches the results of each Round whose Race has started and that is not final yet, and replaces
// the stored ones. One Round at a time, which keeps the requests well under Jolpica's rate limit.
const refreshResults = async (db: Database, resultsSource: ResultsSource, season: number, now: Date) => {
  const updated: SessionRef[] = [];
  const waiting: SessionRef[] = [];
  const errors: string[] = [];

  const rounds = await listRounds(db, season);
  for (const [index, current] of rounds.entries()) {
    const next = rounds[index + 1];
    // A Round becomes final when the next Round starts (CONTEXT.md, "Final Round"). Practice is
    // not a Session, so the next Round's first Session, Qualifying, is where it starts.
    const isFinal = next !== undefined && next.qualifyingStartsAt <= now;
    if (isFinal || current.qualifyingStartsAt > now) {
      continue;
    }
    const qualifying: SessionRef = { round: current.number, kind: "Qualifying" };
    const race: SessionRef = { round: current.number, kind: "Race" };
    // Nothing to fetch before the Race starts: the Starting Grid comes with its results (ADR-0008).
    if (current.raceStartsAt > now) {
      waiting.push(qualifying);
      continue;
    }

    let results: RaceResults | null;
    try {
      results = await resultsSource.fetchRaceResults(season, current.number);
    } catch (error) {
      errors.push(`Round ${current.number} results: ${describeFailure(error)}`);
      continue;
    }
    if (!results) {
      waiting.push(qualifying, race);
      continue;
    }
    await saveRaceResults(db, current.qualifyingId, current.raceId, results);
    updated.push(qualifying, race);
  }

  return { updated, waiting, errors };
};

// Syncs the current Season's schedule, Regular Drivers and results from the ResultsSource, leaving
// Final Rounds untouched. Upserts and replacements, so running it twice changes nothing. Only the
// App Admin may run it.
export const refresh = async (
  { db, resultsSource, clock, appAdminEmails }: RefreshDependencies,
  playerId: string,
): Promise<RefreshOutcome> => {
  if (!(await isAppAdmin(db, appAdminEmails, playerId))) {
    return { status: "refused" };
  }

  const now = clock.now();
  const season = now.getUTCFullYear();
  const errors: string[] = [];

  let schedule: ScheduledRound[] = [];
  let drivers: RegularDriver[] = [];
  try {
    [schedule, drivers] = await Promise.all([
      resultsSource.fetchSchedule(season),
      resultsSource.fetchRegularDrivers(season),
    ]);
  } catch (error) {
    // The Rounds already stored can still get their results.
    errors.push(`Schedule and Regular Drivers: ${describeFailure(error)}`);
  }
  await saveSchedule(db, schedule, now);
  await saveRegularDrivers(db, season, drivers);

  const results = await refreshResults(db, resultsSource, season, now);

  return {
    status: "synced",
    season,
    rounds: schedule.length,
    regularDrivers: drivers.length,
    updated: results.updated,
    waiting: results.waiting,
    errors: [...errors, ...results.errors],
  };
};
