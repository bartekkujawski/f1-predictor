import { randomInt } from "node:crypto";
import { isAppAdmin } from "../app-admin/app-admin";
import type { Database } from "../db/database";
import { eq } from "drizzle-orm";
import { league, member } from "../db/schema";

export type LeagueDependencies = { db: Database; appAdminEmails: readonly string[] };

export type MembershipDependencies = { db: Database };

export type LeagueInvite = { name: string; joinCode: string };

export type CreateLeagueOutcome =
  | { status: "refused" }
  | { status: "created"; league: LeagueInvite }
  | { status: "already-created"; league: LeagueInvite };

// What a Member sees of their League.
export type MemberLeague = { name: string };

export type JoinLeagueOutcome = { status: "invalid-code" } | { status: "joined"; league: MemberLeague };

export type LeagueInviteOutcome = { status: "refused" } | { status: "none" } | { status: "found"; league: LeagueInvite };

// Letters and digits that cannot be mistaken for each other when the code is typed by hand:
// no 0/O and no 1/I/L.
const JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const JOIN_CODE_LENGTH = 8;

// Random from a cryptographic source, so a Join Code cannot be guessed from another one.
const generateJoinCode = (): string =>
  Array.from({ length: JOIN_CODE_LENGTH }, () => JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)]).join("");

// The single League of Part 1, or undefined before the App Admin creates it.
const findLeague = async (db: Database): Promise<LeagueInvite | undefined> => {
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
  const [created] = await db
    .insert(league)
    .values({ name, joinCode: generateJoinCode() })
    .returning({ name: league.name, joinCode: league.joinCode });
  return { status: "created", league: created };
};

// The Join Code is the key to the League, so only the App Admin sees it and sends it on.
export const getLeagueInvite = async (
  { db, appAdminEmails }: LeagueDependencies,
  playerId: string,
): Promise<LeagueInviteOutcome> => {
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
  // Join Codes are generated in uppercase; a code typed by hand may not be.
  const normalized = joinCode.trim().toUpperCase();
  const [found] = await db
    .select({ id: league.id, name: league.name })
    .from(league)
    .where(eq(league.joinCode, normalized));
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
