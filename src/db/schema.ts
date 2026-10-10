import { boolean, index, integer, pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

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

// The calendar and drivers of a Season, synced from the ResultsSource by the refresh.

export const sessionKind = pgEnum("session_kind", ["Qualifying", "Race"]);

export const round = pgTable(
  "round",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    season: integer("season").notNull(),
    // The Round's number in the Season's calendar.
    number: integer("number").notNull(),
    name: text("name").notNull(),
  },
  (table) => [unique("round_season_number_unique").on(table.season, table.number)],
);

// A scored part of a Round. The Lock is stored, so saving a Prediction never depends on the
// ResultsSource being up.
export const session = pgTable(
  "session",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    roundId: integer("round_id")
      .notNull()
      .references(() => round.id, { onDelete: "cascade" }),
    kind: sessionKind("kind").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    locksAt: timestamp("locks_at", { withTimezone: true }).notNull(),
  },
  (table) => [unique("session_round_id_kind_unique").on(table.roundId, table.kind)],
);

export const regularDriver = pgTable(
  "regular_driver",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    season: integer("season").notNull(),
    // The ResultsSource's identifier, e.g. "max_verstappen". Results name drivers by it.
    driverId: text("driver_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
  },
  (table) => [unique("regular_driver_season_driver_id_unique").on(table.season, table.driverId)],
);
