import { describe, expect, it } from "vitest";
import { buildSeasonTable } from "./season-table";

describe("buildSeasonTable", () => {
  it("sums a Member's Session Scores and Exact Hits", () => {
    const table = buildSeasonTable([
      {
        memberId: "ania",
        sessions: [
          { sessionScore: 75, exactHits: 1 },
          { sessionScore: 50, exactHits: 1 },
        ],
      },
    ]);

    expect(table).toEqual([{ position: 1, memberId: "ania", totalPoints: 125, exactHits: 2 }]);
  });

  it("ranks Members by total points, highest first", () => {
    const table = buildSeasonTable([
      { memberId: "ania", sessions: [{ sessionScore: 80, exactHits: 1 }] },
      { memberId: "bartek", sessions: [{ sessionScore: 120, exactHits: 1 }] },
    ]);

    expect(table).toEqual([
      { position: 1, memberId: "bartek", totalPoints: 120, exactHits: 1 },
      { position: 2, memberId: "ania", totalPoints: 80, exactHits: 1 },
    ]);
  });
});
