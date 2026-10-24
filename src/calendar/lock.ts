// Whether a Session still accepts Predictions. Its Session status, for display, says more.
// This file imports nothing, so a client component can use the rule without the database schema.
export type LockState = "open" | "locked";

// Locked at the Lock itself, not one moment later: a save at the Lock is already refused.
export const lockStateAt = (locksAt: Date, now: Date): LockState => (now < locksAt ? "open" : "locked");
