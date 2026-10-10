import { db } from "../db/database";
import { isAppAdmin, parseAppAdminEmails } from "./app-admin";

export const appAdminEmails = parseAppAdminEmails(process.env.APP_ADMIN_EMAILS);

// Whether to show App Admin controls. Only hides them: each use-case checks the role itself.
export const isPlayerAppAdmin = (playerId: string): Promise<boolean> => isAppAdmin(db, appAdminEmails, playerId);
