import { asc, eq } from "drizzle-orm";
import type { Clock } from "../clock/clock";
import type { Database } from "../db/database";
import { round, session } from "../db/schema";
import { findMemberLeague } from "../league/league";
import { roundStartsAt } from "./round";
import { type SessionKind, type SessionStatus, sessionStatusAt, type StoredSession, storedSessionColumns } from "./session";
import { seasonAt } from "./season";

export type CalendarSession = {
  kind: SessionKind;
  startsAt: Date;
  locksAt: Date;
  status: SessionStatus;
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

// The current Season's Rounds and Sessions, each Session with its status at the Clock's moment.
// Only for Members: a Player who has not joined the League is asked to join first.
export const listCalendar = async ({ db, clock }: CalendarDependencies, playerId: string): Promise<CalendarOutcome> => {
  if (!(await findMemberLeague({ db }, playerId))) {
    return { status: "not-a-member" };
  }
  const now = clock.now();
  const season = seasonAt(now);

  const rows = await db
    .select({ number: round.number, name: round.name, stored: storedSessionColumns })
    .from(round)
    .innerJoin(session, eq(session.roundId, round.id))
    .where(eq(round.season, season))
    .orderBy(asc(round.number), asc(session.startsAt));

  const roundRows: { number: number; name: string; sessions: StoredSession[] }[] = [];
  for (const { number, name, stored } of rows) {
    if (roundRows.at(-1)?.number !== number) {
      roundRows.push({ number, name, sessions: [] });
    }
    roundRows.at(-1)!.sessions.push(stored);
  }

  // Every Round of the Season is listed, so the next Round's Sessions are already loaded.
  const rounds: CalendarRound[] = roundRows.map(({ number, name, sessions }, index) => {
    const nextRoundStartsAt = roundStartsAt(roundRows[index + 1]?.sessions ?? []);
    return {
      number,
      name,
      sessions: sessions.map((stored) => ({
        kind: stored.kind,
        startsAt: stored.startsAt,
        locksAt: stored.locksAt,
        status: sessionStatusAt(stored, nextRoundStartsAt, now),
      })),
    };
  });

  const nextOpen = rounds.find((calendarRound) =>
    calendarRound.sessions.some((calendarSession) => calendarSession.status.state === "open"),
  );

  return { status: "listed", calendar: { season, rounds, nextOpenRound: nextOpen?.number ?? null } };
};
