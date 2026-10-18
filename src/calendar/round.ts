// A Round becomes final when the next Round starts (CONTEXT.md, "Final Round"). Practice is not a
// Session, so the next Round's first Session, its Qualifying, is where it starts. The last Round has
// no next one (null): it becomes final when the Season ends, and from then on the app works with
// the next Season and never comes back to this one, so it is never final here.
export const isFinalRound = (nextRoundStartsAt: Date | null, now: Date): boolean =>
  nextRoundStartsAt !== null && nextRoundStartsAt <= now;
