import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import type { GoogleOptions } from "better-auth/social-providers";
import type { Database } from "../db/database";
import * as schema from "../db/schema";

const DAY_IN_SECONDS = 60 * 60 * 24;

// Builds Better Auth around a database, so tests can pass PGlite and a fake Google.
// Better Auth reads BETTER_AUTH_SECRET and BETTER_AUTH_URL from the environment itself.
export const createAuth = (db: Database, google: GoogleOptions) =>
  betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),
    // Better Auth calls the signed-in person a "user"; in our domain it is a Player.
    user: {
      modelName: "player",
      additionalFields: {
        // Set by the hook below, not by the request (input: false). Better Auth checks required
        // fields before hooks run, so it must be optional here; the column is still NOT NULL.
        nickname: { type: "string", required: false, input: false },
      },
    },
    session: {
      fields: { userId: "playerId" },
      // Rounds are often two weeks apart, so a session lasts a month and is renewed daily on use.
      expiresIn: 30 * DAY_IN_SECONDS,
      updateAge: DAY_IN_SECONDS,
    },
    account: { fields: { userId: "playerId" } },
    socialProviders: { google },
    databaseHooks: {
      user: {
        create: {
          // Runs only when the Player is created, so later changes of the Google name
          // do not overwrite the nickname.
          before: async (newPlayer) => ({ data: { ...newPlayer, nickname: newPlayer.name } }),
        },
      },
    },
    // Lets server actions set the session cookie. Must be the last plugin.
    plugins: [nextCookies()],
  });

export type Auth = ReturnType<typeof createAuth>;
