import { db } from "../db/database";
import { requireEnv } from "../env";
import { createAuth } from "./create-auth";

export const auth = createAuth(db, {
  clientId: requireEnv("GOOGLE_CLIENT_ID"),
  clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
});
