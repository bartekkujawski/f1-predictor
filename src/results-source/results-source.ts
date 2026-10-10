// The port through which the app learns the schedule and results (spec #1, "ResultsSource").
// Production uses the Jolpica adapter; tests use the in-memory fake. Results methods come with
// the result refresh.

export type ScheduledRound = {
  season: number;
  number: number;
  name: string;
  qualifyingStartsAt: Date;
  raceStartsAt: Date;
};

export type RegularDriver = {
  // The source's own stable identifier, e.g. "max_verstappen".
  driverId: string;
  code: string;
  name: string;
};

export type ResultsSource = {
  fetchSchedule: (season: number) => Promise<ScheduledRound[]>;
  // The race seats at the start of the Season. Never substitutes or practice-only drivers (ADR-0002).
  fetchRegularDrivers: (season: number) => Promise<RegularDriver[]>;
};
