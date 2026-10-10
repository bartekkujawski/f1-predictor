import { describe, expect, it } from "vitest";
import results2026Round1 from "./fixtures/results-2026-round-1.json";
import schedule2025 from "./fixtures/schedule-2025.json";
import { createJolpicaResultsSource } from "./jolpica";

type RecordedRequest = { url: string; userAgent: string | null };

// Answers every request with the given JSON and records what was asked. No network.
const fakeFetch = (body: unknown) => {
  const requests: RecordedRequest[] = [];
  const fetch = async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), userAgent: new Headers(init?.headers).get("User-Agent") });
    return Response.json(body);
  };
  return { fetch, requests };
};

describe("Jolpica ResultsSource", () => {
  describe("fetchSchedule", () => {
    it("maps each Round to its number, name and Qualifying and Race start times", async () => {
      const source = createJolpicaResultsSource(fakeFetch(schedule2025).fetch);

      const schedule = await source.fetchSchedule(2025);

      expect(schedule[0]).toEqual({
        season: 2025,
        number: 1,
        name: "Australian Grand Prix",
        qualifyingStartsAt: new Date("2025-03-15T05:00:00Z"),
        raceStartsAt: new Date("2025-03-16T04:00:00Z"),
      });
      expect(schedule.map((round) => round.number)).toEqual(Array.from({ length: 24 }, (_, index) => index + 1));
    });

    it("takes Qualifying, not Sprint Qualifying, on a Sprint Weekend", async () => {
      const source = createJolpicaResultsSource(fakeFetch(schedule2025).fetch);

      const [, china] = await source.fetchSchedule(2025);

      expect(china.qualifyingStartsAt).toEqual(new Date("2025-03-22T07:00:00Z"));
    });

    it("leaves out a Round whose Qualifying time is not published yet", async () => {
      const races = schedule2025.MRData.RaceTable.Races;
      const withoutTime = { ...races[2], Qualifying: { date: "2025-04-05" } };
      const body = {
        MRData: { ...schedule2025.MRData, RaceTable: { season: "2025", Races: [races[0], races[1], withoutTime] } },
      };
      const source = createJolpicaResultsSource(fakeFetch(body).fetch);

      const schedule = await source.fetchSchedule(2025);

      expect(schedule.map((round) => round.number)).toEqual([1, 2]);
    });

    it("asks for the Season's schedule with a descriptive User-Agent", async () => {
      const { fetch, requests } = fakeFetch(schedule2025);

      await createJolpicaResultsSource(fetch).fetchSchedule(2025);

      expect(requests).toHaveLength(1);
      expect(requests[0].url).toMatch(/^https:\/\/api\.jolpi\.ca\/ergast\/f1\/2025\.json/);
      expect(requests[0].userAgent).toMatch(/f1-predictor/);
    });
  });

  describe("fetchRegularDrivers", () => {
    it("takes the drivers of the Season's first Race as its Regular Drivers", async () => {
      const source = createJolpicaResultsSource(fakeFetch(results2026Round1).fetch);

      const drivers = await source.fetchRegularDrivers(2026);

      expect(drivers).toHaveLength(22);
      expect(drivers[0]).toEqual({ driverId: "russell", code: "RUS", name: "George Russell" });
    });

    it("includes drivers who did not start that Race, since they still hold a race seat", async () => {
      const source = createJolpicaResultsSource(fakeFetch(results2026Round1).fetch);

      const drivers = await source.fetchRegularDrivers(2026);

      expect(drivers.map((driver) => driver.driverId)).toEqual(expect.arrayContaining(["piastri", "hulkenberg"]));
    });

    it("has no Regular Drivers before the Season's first Race has results", async () => {
      const body = {
        MRData: { ...results2026Round1.MRData, total: "0", RaceTable: { season: "2026", round: "1", Races: [] } },
      };
      const source = createJolpicaResultsSource(fakeFetch(body).fetch);

      expect(await source.fetchRegularDrivers(2026)).toEqual([]);
    });

    it("asks for the results of the Season's first Race with a descriptive User-Agent", async () => {
      const { fetch, requests } = fakeFetch(results2026Round1);

      await createJolpicaResultsSource(fetch).fetchRegularDrivers(2026);

      expect(requests[0].url).toMatch(/^https:\/\/api\.jolpi\.ca\/ergast\/f1\/2026\/1\/results\.json/);
      expect(requests[0].userAgent).toMatch(/f1-predictor/);
    });
  });

  it("fails loudly when the response has more items than one page", async () => {
    const body = { MRData: { ...schedule2025.MRData, total: "150" } };
    const source = createJolpicaResultsSource(fakeFetch(body).fetch);

    await expect(source.fetchSchedule(2025)).rejects.toThrow(/page/);
  });

  it("fails with the status when Jolpica answers with an error", async () => {
    const fetch = async () => new Response("Too Many Requests", { status: 429 });
    const source = createJolpicaResultsSource(fetch);

    await expect(source.fetchSchedule(2025)).rejects.toThrow(/429/);
  });

  it("names Jolpica and the network cause when the request never gets an answer", async () => {
    const fetch = async () => {
      throw new TypeError("fetch failed", { cause: new Error("Connect Timeout Error") });
    };
    const source = createJolpicaResultsSource(fetch);

    await expect(source.fetchSchedule(2025)).rejects.toThrow(/Could not reach Jolpica.*Connect Timeout Error/);
  });
});
