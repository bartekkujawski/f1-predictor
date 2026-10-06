import type { SessionScore } from "./session-score";

export type MemberSessionScores = { memberId: string; sessions: readonly SessionScore[] };

export type SeasonTableRow = {
  position: number;
  memberId: string;
  totalPoints: number;
  exactHits: number;
};

type MemberTotals = Omit<SeasonTableRow, "position">;

// More points first; on equal points, more Exact Hits first. 0 means tied.
const compareTotals = (a: MemberTotals, b: MemberTotals): number =>
  b.totalPoints - a.totalPoints || b.exactHits - a.exactHits;

export const buildSeasonTable = (members: readonly MemberSessionScores[]): SeasonTableRow[] => {
  const totals: MemberTotals[] = members.map((member) => ({
    memberId: member.memberId,
    totalPoints: member.sessions.reduce((sum, session) => sum + session.points, 0),
    exactHits: member.sessions.reduce((sum, session) => sum + session.exactHits, 0),
  }));

  const ranked = totals.toSorted(compareTotals);

  // Members tied on points and Exact Hits share the position of the first of them,
  // and the next position is skipped (1-2-2-4).
  return ranked.map((row) => {
    const firstTied = ranked.findIndex((other) => compareTotals(other, row) === 0);
    return { position: firstTied + 1, ...row };
  });
};
