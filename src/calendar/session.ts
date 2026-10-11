import { session } from "../db/schema";

// The kinds of Session the calendar holds. The scoring module's own SessionKind also accepts the
// Sprint, which the calendar gains in Part 2.
export type SessionKind = (typeof session.kind.enumValues)[number];

// For input from outside, e.g. a form, before it reaches a use-case.
export const isSessionKind = (value: string): value is SessionKind =>
  (session.kind.enumValues as readonly string[]).includes(value);

export type SessionState = "open" | "locked";

// Locked at the Lock itself, not one moment later: a save at the Lock is already refused.
export const sessionStateAt = (locksAt: Date, now: Date): SessionState => (now < locksAt ? "open" : "locked");
