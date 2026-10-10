import { eq } from "drizzle-orm";
import type { Database } from "../db/database";
import { player } from "../db/schema";

// The App Admin is whoever signs in with an email on the allowlist (APP_ADMIN_EMAILS).
// No admin UI grants the role.

export const parseAppAdminEmails = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email !== "");

export const isAppAdmin = async (
  db: Database,
  appAdminEmails: readonly string[],
  playerId: string,
): Promise<boolean> => {
  const [found] = await db.select({ email: player.email }).from(player).where(eq(player.id, playerId));
  if (!found) {
    return false;
  }
  // Email addresses are case-insensitive in practice, and Google may change the case.
  const email = found.email.toLowerCase();
  return appAdminEmails.some((allowed) => allowed.toLowerCase() === email);
};
