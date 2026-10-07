import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// The tables Better Auth needs (ADR-0005). Its "user" model is our Player, so the table and
// the foreign keys use the domain name. The column set follows the Better Auth core schema.

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const player = pgTable("player", {
  id: text("id").primaryKey(),
  // The Google display name, kept up to date by Better Auth.
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // Shown in every League. Copied from the Google name at first sign-in.
  nickname: text("nickname").notNull(),
  ...timestamps,
});

// A signed-in browser; the cookie holds the token. Better Auth calls it a "session", but in our
// domain a Session is a Sprint, Qualifying or Race, so the table is named auth_session.
export const authSession = pgTable(
  "auth_session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    playerId: text("player_id")
      .notNull()
      .references(() => player.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("auth_session_player_id_idx").on(table.playerId)],
);

// A Player's identity at a sign-in provider (only Google for now).
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    playerId: text("player_id")
      .notNull()
      .references(() => player.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [index("account_player_id_idx").on(table.playerId)],
);

// Short-lived values, e.g. the OAuth state during a sign-in.
export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);
