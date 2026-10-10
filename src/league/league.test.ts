import { describe, expect, it } from "vitest";
import { league, player } from "../db/schema";
import { createTestDatabase } from "../db/test-database";
import { createLeague, getLeagueInvite } from "./league";

const appAdmin = { id: "player-admin", name: "Bartek", email: "admin@example.com", nickname: "Bartek" };
const ania = { id: "player-ania", name: "Anna Nowak", email: "ania@example.com", nickname: "Ania" };

const setUp = async () => {
  const db = await createTestDatabase();
  await db.insert(player).values([appAdmin, ania]);
  return { db, dependencies: { db, appAdminEmails: [appAdmin.email] } };
};

type Dependencies = Awaited<ReturnType<typeof setUp>>["dependencies"];

// The League as the App Admin created it, for tests that need one to exist.
const createdLeague = async (dependencies: Dependencies) => {
  const outcome = await createLeague(dependencies, appAdmin.id, "Friends League");
  if (outcome.status !== "created") {
    throw new Error(`Expected the League to be created, got ${outcome.status}.`);
  }
  return outcome.league;
};

describe("createLeague", () => {
  it("refuses a Player who is not the App Admin, and creates nothing", async () => {
    const { db, dependencies } = await setUp();

    const outcome = await createLeague(dependencies, ania.id, "Friends League");

    expect(outcome).toEqual({ status: "refused" });
    expect(await db.select().from(league)).toEqual([]);
  });

  it("creates the League for the App Admin, with a short Join Code", async () => {
    const { dependencies } = await setUp();

    const outcome = await createLeague(dependencies, appAdmin.id, "Friends League");

    expect(outcome).toEqual({
      status: "created",
      league: { name: "Friends League", joinCode: expect.stringMatching(/^[A-Z0-9]{8}$/) },
    });
  });

  it("keeps the single League when asked to create another, and answers with it", async () => {
    const { db, dependencies } = await setUp();
    const first = await createdLeague(dependencies);

    const second = await createLeague(dependencies, appAdmin.id, "Another League");

    expect(second).toEqual({ status: "already-created", league: first });
    expect(await db.select().from(league)).toHaveLength(1);
  });
});

describe("getLeagueInvite", () => {
  it("shows the App Admin the League's name and Join Code", async () => {
    const { dependencies } = await setUp();
    const created = await createdLeague(dependencies);

    expect(await getLeagueInvite(dependencies, appAdmin.id)).toEqual({ status: "found", league: created });
  });

  it("tells the App Admin when the League has not been created yet", async () => {
    const { dependencies } = await setUp();

    expect(await getLeagueInvite(dependencies, appAdmin.id)).toEqual({ status: "none" });
  });

  it("refuses a Player who is not the App Admin", async () => {
    const { dependencies } = await setUp();
    await createdLeague(dependencies);

    expect(await getLeagueInvite(dependencies, ania.id)).toEqual({ status: "refused" });
  });
});
