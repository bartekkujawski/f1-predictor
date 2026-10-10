import type { RegularDriver, ResultsSource, ScheduledRound } from "./results-source";

// The Jolpica F1 API (Ergast-compatible), ADR-0003. Only the fields we read are typed here.

type JolpicaDateTime = { date: string; time?: string };

type JolpicaRace = {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Qualifying?: JolpicaDateTime;
};

type JolpicaDriver = {
  driverId: string;
  code: string;
  givenName: string;
  familyName: string;
};

type JolpicaPage = { limit: string; offset: string; total: string };

type JolpicaScheduleResponse = { MRData: JolpicaPage & { RaceTable: { Races: JolpicaRace[] } } };

type JolpicaResultsResponse = {
  MRData: JolpicaPage & { RaceTable: { Races: { Results: { Driver: JolpicaDriver }[] }[] } };
};

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

const BASE_URL = "https://api.jolpi.ca/ergast/f1";

// Jolpica asks for a descriptive User-Agent (ADR-0003).
const USER_AGENT = "f1-predictor (private prediction league; https://github.com/bartekkujawski/f1-predictor)";

// Larger than any Season's Rounds or drivers, so one page is enough.
const PAGE_LIMIT = 100;

const getJson = async <T extends { MRData: JolpicaPage }>(fetch: Fetch, path: string): Promise<T> => {
  const url = `${BASE_URL}/${path}?limit=${PAGE_LIMIT}`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } }).catch((error: unknown) => {
    // Node's fetch says only "fetch failed"; the reason (timeout, DNS, TLS) is in error.cause.
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : String(error);
    throw new Error(`Could not reach Jolpica at ${url}: ${cause}`, { cause: error });
  });
  if (!response.ok) {
    throw new Error(`Jolpica answered ${response.status} for ${url}`);
  }
  const body = (await response.json()) as T;
  // Reading only the first page of a longer list would silently drop Rounds or drivers.
  if (Number(body.MRData.total) > PAGE_LIMIT) {
    throw new Error(`Jolpica has ${body.MRData.total} items for ${url}, more than one page of ${PAGE_LIMIT}`);
  }
  return body;
};

// Jolpica gives a date and a UTC time ("05:00:00Z") separately; the time is missing until published.
const toDate = ({ date, time }: JolpicaDateTime): Date | null => (time ? new Date(`${date}T${time}`) : null);

const toScheduledRound = (race: JolpicaRace): ScheduledRound | null => {
  const qualifyingStartsAt = race.Qualifying ? toDate(race.Qualifying) : null;
  const raceStartsAt = toDate(race);
  // Without the Qualifying start there is no Lock; the Round is synced once the time is known.
  if (!qualifyingStartsAt || !raceStartsAt) {
    return null;
  }
  return {
    season: Number(race.season),
    number: Number(race.round),
    name: race.raceName,
    qualifyingStartsAt,
    raceStartsAt,
  };
};

const toRegularDriver = (driver: JolpicaDriver): RegularDriver => ({
  driverId: driver.driverId,
  code: driver.code,
  name: `${driver.givenName} ${driver.familyName}`,
});

// Takes fetch as an argument, so tests answer with saved fixtures instead of the network.
export const createJolpicaResultsSource = (fetch: Fetch = globalThis.fetch): ResultsSource => ({
  fetchSchedule: async (season) => {
    const body = await getJson<JolpicaScheduleResponse>(fetch, `${season}.json`);
    return body.MRData.RaceTable.Races.map(toScheduledRound).filter((round) => round !== null);
  },
  // Jolpica's Season driver list also holds substitutes and practice-only drivers, so the race
  // seats are taken from the first Race instead: everyone entered in it, including non-starters.
  // Seat changes later in the Season are Substitutions or edits by the App Admin (ADR-0002).
  fetchRegularDrivers: async (season) => {
    const body = await getJson<JolpicaResultsResponse>(fetch, `${season}/1/results.json`);
    const [firstRace] = body.MRData.RaceTable.Races;
    return firstRace ? firstRace.Results.map((result) => toRegularDriver(result.Driver)) : [];
  },
});
