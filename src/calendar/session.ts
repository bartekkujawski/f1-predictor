import { session } from "../db/schema";
import type { DriverOrder } from "../results-source/results-source";

// The kinds of Session the calendar holds. The scoring module's own SessionKind also accepts the
// Sprint, which the calendar gains in Part 2.
export type SessionKind = (typeof session.kind.enumValues)[number];

// For input from outside, e.g. a form, before it reaches a use-case.
export const isSessionKind = (value: string): value is SessionKind =>
  (session.kind.enumValues as readonly string[]).includes(value);

export type SessionState = "open" | "locked";

// Locked at the Lock itself, not one moment later: a save at the Lock is already refused.
export const sessionStateAt = (locksAt: Date, now: Date): SessionState => (now < locksAt ? "open" : "locked");

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
