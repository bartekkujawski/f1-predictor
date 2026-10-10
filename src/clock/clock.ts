// "Now", as a dependency. Use-cases ask the Clock instead of calling new Date(), so tests can
// pin the time right before or right after a Lock.
export type Clock = { now: () => Date };

export const systemClock: Clock = { now: () => new Date() };

// Always answers with the same moment. For tests.
export const fixedClock = (now: Date): Clock => ({ now: () => new Date(now) });
