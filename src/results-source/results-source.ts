// The port through which the app learns the schedule and results (spec #1, "ResultsSource").
// Production uses the Jolpica adapter; tests use the in-memory fake.

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

// Drivers by position, as the source's driver identifiers; index 0 is P1. Null is a position that
// nobody holds, e.g. a grid slot left empty by a pit lane starter (ADR-0008). Drivers without a
// position are simply absent.
export type DriverOrder = readonly (string | null)[];

// Both come from one Race's results: Jolpica publishes the Starting Grid there (ADR-0008).
export type RaceResults = {
  // Classified finishers only: not the unclassified, those who did not start, or the disqualified.
  officialClassification: DriverOrder;
  // After grid penalties. Pit lane starters and drivers who did not start leave their slot empty.
  startingGrid: DriverOrder;
};

export type ResultsSource = {
  fetchSchedule: (season: number) => Promise<ScheduledRound[]>;
  // The race seats at the start of the Season. Never substitutes or practice-only drivers (ADR-0002).
  fetchRegularDrivers: (season: number) => Promise<RegularDriver[]>;
  // Null until the source publishes the Race's results.
  fetchRaceResults: (season: number, round: number) => Promise<RaceResults | null>;
};
