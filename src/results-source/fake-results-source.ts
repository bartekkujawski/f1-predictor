import type { RaceResults, RegularDriver, ResultsSource, ScheduledRound } from "./results-source";

type SeasonData = {
  schedule: ScheduledRound[];
  regularDrivers: RegularDriver[];
  // Race results by Round number. A Round not listed has no results published yet.
  raceResults?: Record<number, RaceResults>;
};

// An in-memory ResultsSource for tests: answers with the data it was given, per Season.
// A Season it was not given has no Rounds, no Regular Drivers and no results.
export const createFakeResultsSource = (seasons: Record<number, SeasonData>): ResultsSource => ({
  fetchSchedule: async (season) => seasons[season]?.schedule ?? [],
  fetchRegularDrivers: async (season) => seasons[season]?.regularDrivers ?? [],
  fetchRaceResults: async (season, round) => seasons[season]?.raceResults?.[round] ?? null,
});
