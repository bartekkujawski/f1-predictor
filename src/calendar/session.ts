import { session } from "../db/schema";
import type { DriverOrder } from "../results-source/results-source";
import { isFinalRound } from "./round";

// The kinds of Session the calendar holds. The scoring module's own SessionKind also accepts the
// Sprint, which the calendar gains in Part 2.
export type SessionKind = (typeof session.kind.enumValues)[number];

// For input from outside, e.g. a form, before it reaches a use-case.
export const isSessionKind = (value: string): value is SessionKind =>
  (session.kind.enumValues as readonly string[]).includes(value);

// Whether a Session still accepts Predictions. Its Session status, for display, says more.
export type LockState = "open" | "locked";

// Locked at the Lock itself, not one moment later: a save at the Lock is already refused.
export const lockStateAt = (locksAt: Date, now: Date): LockState => (now < locksAt ? "open" : "locked");

// What a Session's Picks are compared with. Qualifying uses the Starting Grid, so grid penalties
// count (ADR-0008); every other Session uses its own Official Classification.
export type ScoredAgainst = "Starting Grid" | "Official Classification";

export const scoredAgainst = (kind: SessionKind): ScoredAgainst =>
  kind === "Qualifying" ? "Starting Grid" : "Official Classification";

// The stored order a Session is scored against, or null while it is not published.
export const orderScoredAgainst = (
  kind: SessionKind,
  orders: { officialClassification: DriverOrder | null; startingGrid: DriverOrder | null },
): DriverOrder | null => (scoredAgainst(kind) === "Starting Grid" ? orders.startingGrid : orders.officialClassification);

// Where a Session stands, for display, the same on every page: open until the Lock, then locked
// until what it is scored against is published. Then it is scored, provisionally until its Round
// is a Final Round, since a refresh may still change the results. A Session that reaches the Final
// Round with nothing published is a Cancelled Session.
export type SessionStatus =
  | { state: "open" }
  | { state: "locked" }
  | { state: "scored"; provisional: boolean }
  | { state: "cancelled" };

export const sessionStatusAt = (
  session: {
    kind: SessionKind;
    locksAt: Date;
    officialClassification: DriverOrder | null;
    startingGrid: DriverOrder | null;
  },
  nextRoundStartsAt: Date | null,
  now: Date,
): SessionStatus => {
  if (lockStateAt(session.locksAt, now) === "open") {
    return { state: "open" };
  }
  const isFinal = isFinalRound(nextRoundStartsAt, now);
  if (orderScoredAgainst(session.kind, session)) {
    return { state: "scored", provisional: !isFinal };
  }
  return isFinal ? { state: "cancelled" } : { state: "locked" };
};
