import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { findNextRoundStart, isFinalRound } from "../calendar/round";
import { seasonAt } from "../calendar/season";
import {
  orderScoredAgainst,
  type ScoredAgainst,
  scoredAgainst,
  type SessionKind,
  type SessionStatus,
  sessionStateAt,
  sessionStatusAt,
} from "../calendar/session";
import type { Clock } from "../clock/clock";
import type { Database } from "../db/database";
import { member, player, prediction, regularDriver, round, session } from "../db/schema";
import { findMemberLeague } from "../league/league";
import type { DriverOrder, RegularDriver } from "../results-source/results-source";
import { type Prediction, scoreSession, type SessionScore, TOP_10_SIZE, toTop10 } from "../scoring/session-score";

export type PredictionDependencies = { db: Database; clock: Clock };

// A Session of the Round, with the Player's own Prediction for it.
export type RoundSession = {
  kind: SessionKind;
  locksAt: Date;
  status: SessionStatus;
  // Null when the Player has no Prediction for this Session yet.
  prediction: Prediction | null;
};

// A Round as the Player predicts it: their own Predictions and the drivers they may pick.
export type RoundPredictions = { number: number; name: string; sessions: RoundSession[]; regularDrivers: RegularDriver[] };

export type PlayerPredictionsOutcome =
  | { status: "not-a-member" }
  | { status: "no-such-round" }
  | { status: "found"; round: RoundPredictions };

// What a viewer may see of a Session's Predictions. Before the Lock only their own, so nobody can
// copy it. From the Lock on, every Member's.
export type VisiblePredictions =
  | { state: "open"; own: Prediction | null }
  | { state: "locked"; members: MemberPrediction[] };

// A Member of the viewer's League with their Prediction, or null if they did not predict, and its
// Session Score: computed here on every read, never stored (ADR-0007). The score is null until the
// Top 10 is published; a Member without a Prediction then scores 0. In a Cancelled Session everyone
// scores 0.
export type MemberPrediction = { nickname: string; prediction: Prediction | null; score: SessionScore | null };

// Positions 1–10 of what the Session is scored against, as far as they are known. A null position
// is an empty grid slot. Not published yet until the results come, and cancelled once its Round is
// final without them, since then they never will.
export type Top10State =
  | { state: "published"; order: DriverOrder }
  | { state: "not-published-yet" }
  | { state: "cancelled" };

// One Session as a Member views it, with the Predictions they are allowed to see.
export type SessionPredictions = {
  round: { number: number; name: string };
  kind: SessionKind;
  locksAt: Date;
  visible: VisiblePredictions;
  regularDrivers: RegularDriver[];
  scoredAgainst: ScoredAgainst;
  top10: Top10State;
};

export type SessionPredictionsOutcome =
  | { status: "not-a-member" }
  | { status: "no-such-session" }
  | { status: "found"; session: SessionPredictions };

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

const listRegularDrivers = (db: Database, season: number): Promise<RegularDriver[]> =>
  db
    .select({ driverId: regularDriver.driverId, code: regularDriver.code, name: regularDriver.name })
    .from(regularDriver)
    .where(eq(regularDriver.season, season))
    .orderBy(asc(regularDriver.name));

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
  const season = seasonAt(now);

  const rows = await db
    .select({
      name: round.name,
      kind: session.kind,
      locksAt: session.locksAt,
      officialClassification: session.officialClassification,
      startingGrid: session.startingGrid,
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

  const drivers = await listRegularDrivers(db, season);
  const nextRoundStartsAt = await findNextRoundStart(db, season, roundNumber);

  return {
    status: "found",
    round: {
      number: roundNumber,
      name: rows[0].name,
      sessions: rows.map(({ kind, locksAt, officialClassification, startingGrid, picks }) => ({
        kind,
        locksAt,
        status: sessionStatusAt({ kind, locksAt, officialClassification, startingGrid }, nextRoundStartsAt, now),
        prediction: picks,
      })),
      regularDrivers: drivers,
    },
  };
};

// Only the viewer's row is selected, so before the Lock nobody else's Prediction is ever loaded.
const findOwnPrediction = async (db: Database, sessionId: number, viewerId: string): Promise<Prediction | null> => {
  const [own] = await db
    .select({ picks: prediction.picks })
    .from(prediction)
    .where(and(eq(prediction.sessionId, sessionId), eq(prediction.playerId, viewerId)));
  return own?.picks ?? null;
};

// Every Member of the viewer's League, with their Prediction for the Session if they made one.
// The caller adds the Session Score.
// Part 1 has exactly one League. With several, a Player sharing two Leagues with the viewer would
// be listed twice, so the viewer would have to choose a League first.
const listMemberPredictions = async (
  db: Database,
  sessionId: number,
  viewerId: string,
): Promise<Omit<MemberPrediction, "score">[]> => {
  const viewerMember = alias(member, "viewer_member");
  return db
    .select({ nickname: player.nickname, prediction: prediction.picks })
    .from(member)
    .innerJoin(viewerMember, and(eq(viewerMember.leagueId, member.leagueId), eq(viewerMember.playerId, viewerId)))
    .innerJoin(player, eq(player.id, member.playerId))
    // A left join, so a Member without a Prediction is still listed, with null.
    .leftJoin(prediction, and(eq(prediction.playerId, member.playerId), eq(prediction.sessionId, sessionId)))
    .orderBy(asc(player.nickname));
};

// The Predictions of one Session that the viewer may see, filtered here in the query rather than
// in the page: what is not loaded cannot reach the browser, so dev tools cannot reveal it.
export const getSessionPredictions = async (
  { db, clock }: PredictionDependencies,
  viewerId: string,
  roundNumber: number,
  kind: SessionKind,
): Promise<SessionPredictionsOutcome> => {
  if (!(await findMemberLeague({ db }, viewerId))) {
    return { status: "not-a-member" };
  }
  const now = clock.now();
  const season = seasonAt(now);

  const [found] = await db
    .select({
      id: session.id,
      roundName: round.name,
      locksAt: session.locksAt,
      officialClassification: session.officialClassification,
      startingGrid: session.startingGrid,
    })
    .from(session)
    .innerJoin(round, eq(session.roundId, round.id))
    .where(and(eq(round.season, season), eq(round.number, roundNumber), eq(session.kind, kind)));
  if (!found) {
    return { status: "no-such-session" };
  }

  const order = orderScoredAgainst(kind, found);
  // Only a Session still waiting for its Top 10 can turn out to be cancelled.
  const top10: Top10State = order
    ? { state: "published", order: order.slice(0, TOP_10_SIZE) }
    : isFinalRound(await findNextRoundStart(db, season, roundNumber), now)
      ? { state: "cancelled" }
      : { state: "not-published-yet" };
  // A Cancelled Session has no Top 10, which the scoring module scores as 0 for everyone.
  const scoredTop10 = top10.state === "published" ? toTop10(top10.order) : null;

  // Scores only come with every Member's Predictions, so before the Lock there are none to see.
  const visible: VisiblePredictions =
    sessionStateAt(found.locksAt, now) === "open"
      ? { state: "open", own: await findOwnPrediction(db, found.id, viewerId) }
      : {
          state: "locked",
          members: (await listMemberPredictions(db, found.id, viewerId)).map((member) => ({
            ...member,
            score: top10.state === "not-published-yet" ? null : scoreSession(kind, scoredTop10, member.prediction),
          })),
        };

  return {
    status: "found",
    session: {
      round: { number: roundNumber, name: found.roundName },
      kind,
      locksAt: found.locksAt,
      visible,
      regularDrivers: await listRegularDrivers(db, season),
      scoredAgainst: scoredAgainst(kind),
      top10,
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
  const season = seasonAt(now);

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
