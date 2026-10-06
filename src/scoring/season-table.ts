import type { SessionResult } from "./session-score";

export type MemberSessionResults = { memberId: string; sessions: readonly SessionResult[] };

export type SeasonTableRow = {
  position: number;
  memberId: string;
  totalPoints: number;
  exactHits: number;
};

export function buildSeasonTable(members: readonly MemberSessionResults[]): SeasonTableRow[] {
  return members.map((member, index) => ({
    position: index + 1,
    memberId: member.memberId,
    totalPoints: member.sessions.reduce((sum, session) => sum + session.sessionScore, 0),
    exactHits: member.sessions.reduce((sum, session) => sum + session.exactHits, 0),
  }));
}
