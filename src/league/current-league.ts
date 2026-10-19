import { appAdminEmails } from "../app-admin/signed-in-app-admin";
import { systemClock } from "../clock/clock";
import { db } from "../db/database";
import { requireEnv } from "../env";
import {
  getLeagueJoinCode,
  joinLeague,
  type JoinLeagueOutcome,
  type LeagueJoinCodeOutcome,
} from "./league";
import { getSeasonTable, type SeasonTableOutcome } from "./season-table";

export const getCurrentLeagueJoinCode = (playerId: string): Promise<LeagueJoinCodeOutcome> =>
  getLeagueJoinCode({ db, appAdminEmails }, playerId);

export const joinCurrentLeague = (playerId: string, joinCode: string): Promise<JoinLeagueOutcome> =>
  joinLeague({ db }, playerId, joinCode);

export const getCurrentSeasonTable = (playerId: string): Promise<SeasonTableOutcome> =>
  getSeasonTable({ db, clock: systemClock }, playerId);

// Shown wherever a Join Code, typed or inside an invite link, matches no League.
export const INVALID_JOIN_CODE_MESSAGE =
  "This Join Code does not match any League. Check it, or ask for a new invite link.";

// An invite link is only a Join Code wrapped in a URL (CONTEXT.md, "Join Code").
export const inviteLink = (joinCode: string): string => new URL(`/join/${joinCode}`, requireEnv("BETTER_AUTH_URL")).href;
