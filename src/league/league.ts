import { eq } from "drizzle-orm";
import { isAppAdmin } from "../app-admin/app-admin";
import type { Database } from "../db/database";
import { league, member } from "../db/schema";
import { generateJoinCode, normalizeJoinCode } from "./join-code";

export type LeagueDependencies = { db: Database; appAdminEmails: readonly string[] };

export type MembershipDependencies = { db: Database };

// The League as the App Admin sees it: its name and the Join Code to send to friends.
export type LeagueJoinCode = { name: string; joinCode: string };

export type CreateLeagueOutcome =
  | { status: "refused" }
  | { status: "invalid-name" }
  | { status: "created"; league: LeagueJoinCode }
  | { status: "already-created"; league: LeagueJoinCode };

// What a Member sees of their League.
export type MemberLeague = { name: string };

export type JoinLeagueOutcome = { status: "invalid-code" } | { status: "joined"; league: MemberLeague };

export type LeagueJoinCodeOutcome = { status: "refused" } | { status: "none" } | { status: "found"; league: LeagueJoinCode };

// The single League of Part 1, or undefined before the App Admin creates it.
const findLeague = async (db: Database): Promise<LeagueJoinCode | undefined> => {
  const [found] = await db.select({ name: league.name, joinCode: league.joinCode }).from(league).limit(1);
  return found;
};

export const createLeague = async (
  { db, appAdminEmails }: LeagueDependencies,
  playerId: string,
  name: string,
): Promise<CreateLeagueOutcome> => {
  if (!(await isAppAdmin(db, appAdminEmails, playerId))) {
    return { status: "refused" };
  }
  // Part 1 has exactly one League (spec #1), so it is created once.
  const existing = await findLeague(db);
  if (existing) {
    return { status: "already-created", league: existing };
  }
  const trimmedName = name.trim();
  if (trimmedName === "") {
    return { status: "invalid-name" };
  }
  const [created] = await db
    .insert(league)
    .values({ name: trimmedName, joinCode: generateJoinCode() })
    .returning({ id: league.id, name: league.name, joinCode: league.joinCode });
  // The App Admin plays too, so they need not open their own invite link.
  await db.insert(member).values({ playerId, leagueId: created.id });
  return { status: "created", league: { name: created.name, joinCode: created.joinCode } };
};

// The Join Code is the key to the League, so only the App Admin sees it and sends it on.
export const getLeagueJoinCode = async (
  { db, appAdminEmails }: LeagueDependencies,
  playerId: string,
): Promise<LeagueJoinCodeOutcome> => {
  if (!(await isAppAdmin(db, appAdminEmails, playerId))) {
    return { status: "refused" };
  }
  const found = await findLeague(db);
  return found ? { status: "found", league: found } : { status: "none" };
};

export const joinLeague = async (
  { db }: MembershipDependencies,
  playerId: string,
  joinCode: string,
): Promise<JoinLeagueOutcome> => {
  const [found] = await db
    .select({ id: league.id, name: league.name })
    .from(league)
    .where(eq(league.joinCode, normalizeJoinCode(joinCode)));
  if (!found) {
    return { status: "invalid-code" };
  }
  // Opening the invite link again changes nothing: the existing Member row is kept as it is,
  // including when the Player joined.
  await db.insert(member).values({ playerId, leagueId: found.id }).onConflictDoNothing();
  return { status: "joined", league: { name: found.name } };
};

// The League the Player is a Member of, or null. Part 1 allows at most one.
export const findMemberLeague = async ({ db }: MembershipDependencies, playerId: string): Promise<MemberLeague | null> => {
  const [found] = await db
    .select({ name: league.name })
    .from(member)
    .innerJoin(league, eq(member.leagueId, league.id))
    .where(eq(member.playerId, playerId))
    .limit(1);
  return found ?? null;
};
