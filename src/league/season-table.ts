import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { orderScoredAgainst } from "../calendar/session";
import type { Clock } from "../clock/clock";
import type { Database } from "../db/database";
import { member, player, prediction, round, session } from "../db/schema";
import { buildSeasonTable, type SeasonTableRow } from "../scoring/season-table";
import { scoreSession, toTop10 } from "../scoring/session-score";
import { findMemberLeague } from "./league";

export type SeasonTableDependencies = { db: Database; clock: Clock };

// One Member's place in the Season Table, shown by nickname.
export type SeasonTableEntry = Omit<SeasonTableRow, "memberId"> & { nickname: string };

export type SeasonTableOutcome = { status: "not-a-member" } | { status: "found"; table: SeasonTableEntry[] };

// Every Member of the viewer's League, by nickname, so Members tied in the table keep a fixed order.
// Part 1 has exactly one League, as in listMemberPredictions.
const listMembers = (db: Database, viewerId: string) => {
  const viewerMember = alias(member, "viewer_member");
  return db
    .select({ playerId: member.playerId, nickname: player.nickname })
    .from(member)
    .innerJoin(viewerMember, and(eq(viewerMember.leagueId, member.leagueId), eq(viewerMember.playerId, viewerId)))
    .innerJoin(player, eq(player.id, member.playerId))
    .orderBy(asc(player.nickname));
};

// The Season Table of the viewer's League in the current Season, computed on every read from the
// stored Predictions and results, never stored (ADR-0007). Only for Members.
export const getSeasonTable = async (
  { db, clock }: SeasonTableDependencies,
  viewerId: string,
): Promise<SeasonTableOutcome> => {
  if (!(await findMemberLeague({ db }, viewerId))) {
    return { status: "not-a-member" };
  }
  const season = clock.now().getUTCFullYear();

  const members = await listMembers(db, viewerId);
  const sessions = await db
    .select({
      id: session.id,
      kind: session.kind,
      officialClassification: session.officialClassification,
      startingGrid: session.startingGrid,
    })
    .from(session)
    .innerJoin(round, eq(session.roundId, round.id))
    .where(eq(round.season, season));
  // Predictions of every Player in the Season. With one League in Part 1 they are all its Members'.
  const predictions = await db
    .select({ playerId: prediction.playerId, sessionId: prediction.sessionId, picks: prediction.picks })
    .from(prediction)
    .innerJoin(session, eq(prediction.sessionId, session.id))
    .innerJoin(round, eq(session.roundId, round.id))
    .where(eq(round.season, season));
  const picksOf = (playerId: string, sessionId: number) =>
    predictions.find((saved) => saved.playerId === playerId && saved.sessionId === sessionId)?.picks ?? null;

  // Only a Session with a published Top 10 adds to the table. One not published yet adds nothing so
  // far, and a Cancelled Session scores 0 for everyone, so both are left out.
  const scored = sessions.flatMap((scoredSession) => {
    const order = orderScoredAgainst(scoredSession.kind, scoredSession);
    return order ? [{ ...scoredSession, top10: toTop10(order) }] : [];
  });

  const rows = buildSeasonTable(
    members.map(({ playerId }) => ({
      memberId: playerId,
      sessions: scored.map(({ id, kind, top10 }) => scoreSession(kind, top10, picksOf(playerId, id))),
    })),
  );
  const nicknames = new Map(members.map(({ playerId, nickname }) => [playerId, nickname]));
  return {
    status: "found",
    table: rows.map(({ memberId, ...row }) => ({ ...row, nickname: nicknames.get(memberId) ?? "" })),
  };
};
