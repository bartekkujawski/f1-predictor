import { describe, expect, it } from "vitest";
import { fixedClock } from "../clock/clock";
import type { Database } from "../db/database";
import { player } from "../db/schema";
import { createTestDatabase } from "../db/test-database";
import { savePrediction } from "../prediction/prediction";
import { refresh } from "../refresh/refresh";
import { createFakeResultsSource } from "../results-source/fake-results-source";
import type { RaceResults, RegularDriver, ScheduledRound } from "../results-source/results-source";
import { createLeague, joinLeague } from "./league";
import { getSeasonTable } from "./season-table";

const bahrain: ScheduledRound = {
  season: 2026,
  number: 1,
  name: "Bahrain Grand Prix",
  qualifyingStartsAt: new Date("2026-03-07T15:00:00Z"),
  raceStartsAt: new Date("2026-03-08T15:00:00Z"),
};

const saudiArabia: ScheduledRound = {
  season: 2026,
  number: 2,
  name: "Saudi Arabian Grand Prix",
  qualifyingStartsAt: new Date("2026-03-21T17:00:00Z"),
  raceStartsAt: new Date("2026-03-22T17:00:00Z"),
};

const schedule = [bahrain, saudiArabia];

const driverIds = [
  "norris", "piastri", "max_verstappen", "russell", "leclerc", "hamilton",
  "antonelli", "albon", "sainz", "alonso", "stroll", "gasly",
];
const regularDrivers: RegularDriver[] = driverIds.map((driverId) => ({ driverId, code: driverId, name: driverId }));

// Both Rounds finish in this order, from the same grid.
const results: RaceResults = { officialClassification: driverIds, startingGrid: driverIds };
const topTen = driverIds.slice(0, 10);
// Each Pick 1–8 is two places off the Top 10 (5 + 10 points), and Picks 9–10 are outside it.
const otherTopTen = driverIds.slice(2, 12);

const appAdmin = { id: "player-admin", name: "Bartek", email: "admin@example.com", nickname: "Bartek" };
const ania = { id: "player-ania", name: "Anna Nowak", email: "ania@example.com", nickname: "Ania" };
const celina = { id: "player-celina", name: "Celina Wrona", email: "celina@example.com", nickname: "Celina" };
const darek = { id: "player-darek", name: "Darek Sowa", email: "darek@example.com", nickname: "Darek" };
const outsider = { id: "player-ola", name: "Ola Lis", email: "ola@example.com", nickname: "Ola" };

// Before each Round's Lock, and after the Race before it.
const BEFORE_LOCK: Record<number, string> = { 1: "2026-03-01T12:00:00Z", 2: "2026-03-15T12:00:00Z" };
const AFTER_ROUND_1_RACE = "2026-03-08T18:00:00Z";
const AFTER_ROUND_2_RACE = "2026-03-22T20:00:00Z";

const at = (iso: string) => fixedClock(new Date(iso));

// Stores the results the source has at the given moment, the way the App Admin's refresh does.
const refreshAt = (db: Database, iso: string, raceResults: Record<number, RaceResults> = {}) =>
  refresh(
    {
      db,
      resultsSource: createFakeResultsSource({ 2026: { schedule, regularDrivers, raceResults } }),
      clock: at(iso),
      appAdminEmails: [appAdmin.email],
    },
    appAdmin.id,
  );

// The calendar and Regular Drivers synced, with the App Admin and Ania Members of the League.
// Returns the Join Code, so a test can let more Players join later.
const syncedDatabase = async () => {
  const db = await createTestDatabase();
  await db.insert(player).values([appAdmin, ania, celina, darek, outsider]);
  const created = await createLeague({ db, appAdminEmails: [appAdmin.email] }, appAdmin.id, "Friends League");
  if (created.status !== "created") {
    throw new Error(`Expected the League to be created, got ${created.status}.`);
  }
  const { joinCode } = created.league;
  await joinLeague({ db }, ania.id, joinCode);
  await refreshAt(db, "2026-01-01T00:00:00Z");
  return { db, joinCode };
};

const predict = (db: Database, playerId: string, round: number, kind: "Qualifying" | "Race", picks: string[]) =>
  savePrediction({ db, clock: at(BEFORE_LOCK[round]) }, playerId, { round, kind, picks });

describe("getSeasonTable", () => {
  it("ranks every Member by the total of their Session Scores, with tied Members sharing a position", async () => {
    const { db, joinCode } = await syncedDatabase();
    // Ania predicts Round 1 perfectly, Bartek Round 2: the same points and Exact Hits.
    await predict(db, ania.id, 1, "Race", topTen);
    await predict(db, appAdmin.id, 2, "Race", topTen);
    await refreshAt(db, AFTER_ROUND_1_RACE, { 1: results });
    // Celina joins mid-season and predicts only Round 2. Darek joins and never predicts.
    await joinLeague({ db }, celina.id, joinCode);
    await joinLeague({ db }, darek.id, joinCode);
    await predict(db, celina.id, 2, "Race", otherTopTen);
    await refreshAt(db, AFTER_ROUND_2_RACE, { 1: results, 2: results });

    const outcome = await getSeasonTable({ db, clock: at(AFTER_ROUND_2_RACE) }, ania.id);

    expect(outcome).toEqual({
      status: "found",
      table: [
        // A Perfect Top 10 in a Race: ten Exact Hits of 25 points, plus 50, times 3.
        { position: 1, nickname: "Ania", totalPoints: 900, exactHits: 10 },
        { position: 1, nickname: "Bartek", totalPoints: 900, exactHits: 10 },
        { position: 3, nickname: "Celina", totalPoints: 8 * 15 * 3, exactHits: 0 },
        { position: 4, nickname: "Darek", totalPoints: 0, exactHits: 0 },
      ],
    });
  });

  it("ranks Members on equal points by more Exact Hits", async () => {
    const { db } = await syncedDatabase();
    // A Perfect Top 10 in Qualifying: ten Exact Hits of 25, plus 50, times 2.
    await predict(db, ania.id, 1, "Qualifying", topTen);
    // Eight Exact Hits in the Race and two drivers outside the Top 10: 8 × 25, times 3. Also 600.
    await predict(db, appAdmin.id, 1, "Race", [...topTen.slice(0, 8), "stroll", "gasly"]);
    await refreshAt(db, AFTER_ROUND_1_RACE, { 1: results });

    const outcome = await getSeasonTable({ db, clock: at(AFTER_ROUND_1_RACE) }, appAdmin.id);

    expect(outcome).toEqual({
      status: "found",
      table: [
        { position: 1, nickname: "Ania", totalPoints: 600, exactHits: 10 },
        { position: 2, nickname: "Bartek", totalPoints: 600, exactHits: 8 },
      ],
    });
  });

  it("adds nothing for a Session whose results are not published yet", async () => {
    const { db } = await syncedDatabase();
    await predict(db, ania.id, 1, "Race", otherTopTen);
    await predict(db, ania.id, 2, "Race", topTen);
    // Round 2 has been raced, but its results are not in the source yet.
    await refreshAt(db, AFTER_ROUND_1_RACE, { 1: results });

    const outcome = await getSeasonTable({ db, clock: at(AFTER_ROUND_2_RACE) }, ania.id);

    expect(outcome).toEqual({
      status: "found",
      table: [
        { position: 1, nickname: "Ania", totalPoints: 8 * 15 * 3, exactHits: 0 },
        { position: 2, nickname: "Bartek", totalPoints: 0, exactHits: 0 },
      ],
    });
  });

  it("scores Qualifying against the Starting Grid, not its Official Classification", async () => {
    const { db } = await syncedDatabase();
    await predict(db, ania.id, 1, "Qualifying", topTen);
    await refreshAt(db, AFTER_ROUND_1_RACE, { 1: { officialClassification: otherTopTen, startingGrid: driverIds } });

    const outcome = await getSeasonTable({ db, clock: at(AFTER_ROUND_1_RACE) }, ania.id);

    // A Perfect Top 10 against the grid: ten Exact Hits of 25, plus 50, times Qualifying's 2.
    expect(outcome.status === "found" && outcome.table[0]).toEqual({
      position: 1,
      nickname: "Ania",
      totalPoints: 600,
      exactHits: 10,
    });
  });

  it("counts only the current Season", async () => {
    const { db } = await syncedDatabase();
    await predict(db, ania.id, 1, "Race", topTen);
    await refreshAt(db, AFTER_ROUND_1_RACE, { 1: results });

    // The calendar year has ended, so it is a new Season with nothing scored yet.
    const outcome = await getSeasonTable({ db, clock: at("2027-01-01T00:00:00Z") }, ania.id);

    expect(outcome).toEqual({
      status: "found",
      table: [
        { position: 1, nickname: "Ania", totalPoints: 0, exactHits: 0 },
        { position: 1, nickname: "Bartek", totalPoints: 0, exactHits: 0 },
      ],
    });
  });

  it("gives a Player who is not a Member nothing", async () => {
    const { db } = await syncedDatabase();

    const outcome = await getSeasonTable({ db, clock: at(AFTER_ROUND_2_RACE) }, outsider.id);

    expect(outcome).toEqual({ status: "not-a-member" });
  });
});
