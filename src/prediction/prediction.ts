import { and, asc, eq, inArray } from "drizzle-orm";
import { type SessionKind, type SessionState, sessionStateAt } from "../calendar/session";
import type { Clock } from "../clock/clock";
import type { Database } from "../db/database";
import { prediction, regularDriver, round, session } from "../db/schema";
import { findMemberLeague } from "../league/league";
import type { RegularDriver } from "../results-source/results-source";
import { type Prediction, TOP_10_SIZE } from "../scoring/session-score";

export type PredictionDependencies = { db: Database; clock: Clock };

// A Session of the Round, with the Player's own Prediction for it.
export type RoundSession = {
  kind: SessionKind;
  locksAt: Date;
  state: SessionState;
  // Null when the Player has no Prediction for this Session yet.
  prediction: Prediction | null;
};

// A Round as the Player predicts it: their own Predictions and the drivers they may pick.
export type RoundPredictions = { number: number; name: string; sessions: RoundSession[]; regularDrivers: RegularDriver[] };

export type PlayerPredictionsOutcome =
  | { status: "not-a-member" }
  | { status: "no-such-round" }
  | { status: "found"; round: RoundPredictions };

export type PredictionInput = { round: number; kind: SessionKind; picks: Prediction };

// Why a Prediction cannot be saved. Each one breaks "ten different Regular Drivers in order".
export type InvalidPredictionReason = "not-ten-picks" | "duplicate-driver" | "not-a-regular-driver";

export type SavePredictionOutcome =
  | { status: "not-a-member" }
  | { status: "no-such-session" }
  | { status: "locked" }
  | { status: "invalid"; reason: InvalidPredictionReason }
  | { status: "saved" };

const checkPicks = async (
  db: Database,
  season: number,
  picks: Prediction,
): Promise<InvalidPredictionReason | null> => {
  // docs/rules.md: incomplete Predictions cannot be saved.
  if (picks.length !== TOP_10_SIZE) {
    return "not-ten-picks";
  }
  if (new Set(picks).size !== picks.length) {
    return "duplicate-driver";
  }
  const known = await db
    .select({ driverId: regularDriver.driverId })
    .from(regularDriver)
    .where(and(eq(regularDriver.season, season), inArray(regularDriver.driverId, [...picks])));
  return known.length === picks.length ? null : "not-a-regular-driver";
};

// The Player's own Predictions for one Round of the current Season. Only for Members.
export const getPlayerPredictions = async (
  { db, clock }: PredictionDependencies,
  playerId: string,
  roundNumber: number,
): Promise<PlayerPredictionsOutcome> => {
  if (!(await findMemberLeague({ db }, playerId))) {
    return { status: "not-a-member" };
  }
  const now = clock.now();
  const season = now.getUTCFullYear();

  const rows = await db
    .select({
      name: round.name,
      kind: session.kind,
      locksAt: session.locksAt,
      picks: prediction.picks,
    })
    .from(round)
    .innerJoin(session, eq(session.roundId, round.id))
    // Only this Player's Prediction is joined, so nobody else's is ever loaded.
    .leftJoin(prediction, and(eq(prediction.sessionId, session.id), eq(prediction.playerId, playerId)))
    .where(and(eq(round.season, season), eq(round.number, roundNumber)))
    .orderBy(asc(session.startsAt));
  if (rows.length === 0) {
    return { status: "no-such-round" };
  }

  const drivers = await db
    .select({ driverId: regularDriver.driverId, code: regularDriver.code, name: regularDriver.name })
    .from(regularDriver)
    .where(eq(regularDriver.season, season))
    .orderBy(asc(regularDriver.name));

  return {
    status: "found",
    round: {
      number: roundNumber,
      name: rows[0].name,
      sessions: rows.map(({ kind, locksAt, picks }) => ({
        kind,
        locksAt,
        state: sessionStateAt(locksAt, now),
        prediction: picks,
      })),
      regularDrivers: drivers,
    },
  };
};

// Saves the Player's Prediction for one Session, or replaces the one already saved. Only for
// Members, only until the Lock, and only ten different Regular Drivers of the current Season.
export const savePrediction = async (
  { db, clock }: PredictionDependencies,
  playerId: string,
  input: PredictionInput,
): Promise<SavePredictionOutcome> => {
  if (!(await findMemberLeague({ db }, playerId))) {
    return { status: "not-a-member" };
  }
  const now = clock.now();
  const season = now.getUTCFullYear();

  const [found] = await db
    .select({ id: session.id, locksAt: session.locksAt })
    .from(session)
    .innerJoin(round, eq(session.roundId, round.id))
    .where(and(eq(round.season, season), eq(round.number, input.round), eq(session.kind, input.kind)));
  if (!found) {
    return { status: "no-such-session" };
  }
  // Checked against the Clock at the moment of saving, never against what the page showed.
  // The write below does not check the Lock again. A save that arrives a few milliseconds before
  // the Lock is accepted even if the upsert lands just after it. That is accepted on purpose: the
  // Member was in time, and nobody can see other Predictions within those milliseconds. Closing
  // the gap would need the Lock inside the upsert itself (INSERT ... SELECT, in raw SQL).
  if (sessionStateAt(found.locksAt, now) === "locked") {
    return { status: "locked" };
  }
  const invalid = await checkPicks(db, season, input.picks);
  if (invalid) {
    return { status: "invalid", reason: invalid };
  }

  await db
    .insert(prediction)
    .values({ playerId, sessionId: found.id, picks: [...input.picks], updatedAt: now })
    .onConflictDoUpdate({
      target: [prediction.playerId, prediction.sessionId],
      set: { picks: [...input.picks], updatedAt: now },
    });
  return { status: "saved" };
};
