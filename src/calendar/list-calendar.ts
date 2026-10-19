import { asc, eq } from "drizzle-orm";
import type { Clock } from "../clock/clock";
import type { Database } from "../db/database";
import { round, session } from "../db/schema";
import { findMemberLeague } from "../league/league";
import { type SessionKind, type SessionState, sessionStateAt } from "./session";
import { seasonAt } from "./season";

export type CalendarSession = {
  kind: SessionKind;
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

export type CalendarOutcome = { status: "not-a-member" } | { status: "listed"; calendar: Calendar };

export type CalendarDependencies = { db: Database; clock: Clock };

// The current Season's Rounds and Sessions, each Session open or locked according to the Clock.
// Only for Members: a Player who has not joined the League is asked to join first.
export const listCalendar = async ({ db, clock }: CalendarDependencies, playerId: string): Promise<CalendarOutcome> => {
  if (!(await findMemberLeague({ db }, playerId))) {
    return { status: "not-a-member" };
  }
  const now = clock.now();
  const season = seasonAt(now);

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
    rounds.at(-1)!.sessions.push({ kind, startsAt, locksAt, state: sessionStateAt(locksAt, now) });
  }

  const nextOpen = rounds.find((calendarRound) =>
    calendarRound.sessions.some((calendarSession) => calendarSession.state === "open"),
  );

  return { status: "listed", calendar: { season, rounds, nextOpenRound: nextOpen?.number ?? null } };
};
