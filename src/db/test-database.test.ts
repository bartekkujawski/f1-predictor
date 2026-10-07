import { describe, expect, it } from "vitest";
import { player } from "./schema";
import { createTestDatabase } from "./test-database";

const ania = {
  id: "player-ania",
  name: "Anna Nowak",
  email: "ania@example.com",
  nickname: "Ania",
};

describe("createTestDatabase", () => {
  it("applies the migrations, so the schema's tables exist", async () => {
    const db = await createTestDatabase();

    await db.insert(player).values(ania);

    expect(await db.select({ nickname: player.nickname }).from(player)).toEqual([{ nickname: "Ania" }]);
  });

  it("gives every test its own empty database", async () => {
    const first = await createTestDatabase();
    const second = await createTestDatabase();

    await first.insert(player).values(ania);

    expect(await second.select().from(player)).toEqual([]);
  });
});
