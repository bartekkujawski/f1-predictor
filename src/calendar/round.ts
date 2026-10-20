import { and, asc, eq, gt } from "drizzle-orm";
import type { Database } from "../db/database";
import { round, session } from "../db/schema";
import type { SessionKind } from "./session";

// A Round becomes final when the next Round starts (CONTEXT.md, "Final Round"). Practice is not a
// Session, so the next Round's first Session, its Qualifying, is where it starts. The last Round has
// no next one (null): it becomes final when the Season ends, and from then on the app works with
// the next Season and never comes back to this one, so it is never final here.
export const isFinalRound = (nextRoundStartsAt: Date | null, now: Date): boolean =>
  nextRoundStartsAt !== null && nextRoundStartsAt <= now;

// When a Round starts: its first Session, its Qualifying (CONTEXT.md, "Final Round"). Null when its
// Sessions do not include one. findNextRoundStart applies the same rule in its query.
export const roundStartsAt = (sessions: readonly { kind: SessionKind; startsAt: Date }[]): Date | null =>
  sessions.find((roundSession) => roundSession.kind === "Qualifying")?.startsAt ?? null;

// When the Round after the given one starts: its Qualifying, the first Session (CONTEXT.md, "Final
// Round"). Null for the last Round of the Season.
export const findNextRoundStart = async (db: Database, season: number, roundNumber: number): Promise<Date | null> => {
  const [next] = await db
    .select({ startsAt: session.startsAt })
    .from(round)
    .innerJoin(session, and(eq(session.roundId, round.id), eq(session.kind, "Qualifying")))
    .where(and(eq(round.season, season), gt(round.number, roundNumber)))
    .orderBy(asc(round.number))
    .limit(1);
  return next?.startsAt ?? null;
};
