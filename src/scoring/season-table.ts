import type { SessionResult } from "./session-score";

export type MemberSessionResults = { memberId: string; sessions: readonly SessionResult[] };

export type SeasonTableRow = {
  position: number;
  memberId: string;
  totalPoints: number;
  exactHits: number;
};

export function buildSeasonTable(members: readonly MemberSessionResults[]): SeasonTableRow[] {
  const totals = members.map((member) => ({
    memberId: member.memberId,
    totalPoints: member.sessions.reduce((sum, session) => sum + session.sessionScore, 0),
    exactHits: member.sessions.reduce((sum, session) => sum + session.exactHits, 0),
  }));

  const ranked = totals.sort(
    (a, b) => b.totalPoints - a.totalPoints || b.exactHits - a.exactHits,
  );

  return ranked.map((row, index) => ({ position: index + 1, ...row }));
}
