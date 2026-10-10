import { asc, eq } from "drizzle-orm";
import type { Clock } from "../clock/clock";
import type { Database } from "../db/database";
import { round, session } from "../db/schema";

export type SessionState = "open" | "locked";

export type CalendarSession = {
  kind: (typeof session.kind.enumValues)[number];
  startsAt: Date;
  locksAt: Date;
  state: SessionState;
};

export type CalendarRound = { number: number; name: string; sessions: CalendarSession[] };

export type Calendar = {
  season: number;
  rounds: CalendarRound[];
  // The number of the first Round with a Session still open, or null when all have locked.
  nextOpenRound: number | null;
};

export type CalendarDependencies = { db: Database; clock: Clock };

// The current Season's Rounds and Sessions, each Session open or locked according to the Clock.
export const listCalendar = async ({ db, clock }: CalendarDependencies): Promise<Calendar> => {
  const now = clock.now();
  const season = now.getUTCFullYear();

  const rows = await db
    .select({
      number: round.number,
      name: round.name,
      kind: session.kind,
      startsAt: session.startsAt,
      locksAt: session.locksAt,
    })
    .from(round)
    .innerJoin(session, eq(session.roundId, round.id))
    .where(eq(round.season, season))
    .orderBy(asc(round.number), asc(session.startsAt));

  const rounds: CalendarRound[] = [];
  for (const { number, name, kind, startsAt, locksAt } of rows) {
    if (rounds.at(-1)?.number !== number) {
      rounds.push({ number, name, sessions: [] });
    }
    // Locked at the Lock itself, not one moment later: a save at the Lock is already refused.
    const state: SessionState = now < locksAt ? "open" : "locked";
    rounds.at(-1)!.sessions.push({ kind, startsAt, locksAt, state });
  }

  const nextOpen = rounds.find((calendarRound) =>
    calendarRound.sessions.some((calendarSession) => calendarSession.state === "open"),
  );

  return { season, rounds, nextOpenRound: nextOpen?.number ?? null };
};
