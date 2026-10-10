import type { RegularDriver, ResultsSource, ScheduledRound } from "./results-source";

type SeasonData = { schedule: ScheduledRound[]; regularDrivers: RegularDriver[] };

// An in-memory ResultsSource for tests: answers with the data it was given, per Season.
// A Season it was not given has no Rounds and no Regular Drivers.
export const createFakeResultsSource = (seasons: Record<number, SeasonData>): ResultsSource => ({
  fetchSchedule: async (season) => seasons[season]?.schedule ?? [],
  fetchRegularDrivers: async (season) => seasons[season]?.regularDrivers ?? [],
});
