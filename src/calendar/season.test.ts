import { describe, expect, it } from "vitest";
import { seasonAt } from "./season";

describe("seasonAt", () => {
  it("is still the old Season in the last second of the calendar year", () => {
    expect(seasonAt(new Date("2026-12-31T23:59:59Z"))).toBe(2026);
  });

  it("is the new Season from the first moment of the new calendar year", () => {
    expect(seasonAt(new Date("2027-01-01T00:00:00Z"))).toBe(2027);
  });
});
