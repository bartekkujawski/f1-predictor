// The Season a moment belongs to (CONTEXT.md, "Season"): it ends when the calendar year ends, in UTC,
// the time zone every stored moment is in.
export const seasonAt = (now: Date): number => now.getUTCFullYear();
