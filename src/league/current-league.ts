import { appAdminEmails } from "../app-admin/signed-in-app-admin";
import { db } from "../db/database";
import { requireEnv } from "../env";
import {
  findMemberLeague,
  getLeagueInvite,
  joinLeague,
  type JoinLeagueOutcome,
  type LeagueInviteOutcome,
  type MemberLeague,
} from "./league";

export const getCurrentLeagueInvite = (playerId: string): Promise<LeagueInviteOutcome> =>
  getLeagueInvite({ db, appAdminEmails }, playerId);

export const findCurrentMemberLeague = (playerId: string): Promise<MemberLeague | null> =>
  findMemberLeague({ db }, playerId);

export const joinCurrentLeague = (playerId: string, joinCode: string): Promise<JoinLeagueOutcome> =>
  joinLeague({ db }, playerId, joinCode);

// An invite link is only a Join Code wrapped in a URL (CONTEXT.md, "Join Code").
export const inviteLink = (joinCode: string): string => new URL(`/join/${joinCode}`, requireEnv("BETTER_AUTH_URL")).href;
