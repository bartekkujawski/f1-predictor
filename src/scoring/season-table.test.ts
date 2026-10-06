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

  it("breaks a tie on points by more Exact Hits", () => {
    const table = buildSeasonTable([
      { memberId: "ania", sessions: [{ sessionScore: 100, exactHits: 2 }] },
      { memberId: "bartek", sessions: [{ sessionScore: 100, exactHits: 4 }] },
    ]);

    expect(table).toEqual([
      { position: 1, memberId: "bartek", totalPoints: 100, exactHits: 4 },
      { position: 2, memberId: "ania", totalPoints: 100, exactHits: 2 },
    ]);
  });

  it("gives Members still tied after Exact Hits a shared position, and skips the next one", () => {
    const table = buildSeasonTable([
      { memberId: "ania", sessions: [{ sessionScore: 120, exactHits: 5 }] },
      { memberId: "bartek", sessions: [{ sessionScore: 100, exactHits: 3 }] },
      { memberId: "celina", sessions: [{ sessionScore: 100, exactHits: 3 }] },
      { memberId: "darek", sessions: [{ sessionScore: 80, exactHits: 2 }] },
    ]);

    expect(table).toEqual([
      { position: 1, memberId: "ania", totalPoints: 120, exactHits: 5 },
      { position: 2, memberId: "bartek", totalPoints: 100, exactHits: 3 },
      { position: 2, memberId: "celina", totalPoints: 100, exactHits: 3 },
      { position: 4, memberId: "darek", totalPoints: 80, exactHits: 2 },
    ]);
  });
});
