export type SessionKind = "Sprint" | "Qualifying" | "Race";

export type RegularDriverId = string;

// Position → Regular Driver, from the Official Classification or, for Qualifying, the Starting Grid.
// A missing key is an empty slot (ADR-0008). Positions beyond 10 may be passed and score 0.
export type Top10 = ReadonlyMap<number, RegularDriverId>;

// Ten different Regular Drivers in predicted order; index 0 is P1.
// Not validated here: a Prediction is checked when it is saved (docs/rules.md),
// so the scoring module trusts its input.
export type Prediction = readonly RegularDriverId[];

export type SessionScore = { points: number; exactHits: number };

// Positions that score. Also the length of a Prediction.
const TOP_10_SIZE = 10;

const BASE_POINTS = 5;

// Position Difference → Accuracy Bonus. A difference not listed earns no bonus.
const ACCURACY_BONUS: Record<number, number> = {
  0: 20,
  1: 14,
  2: 10,
  3: 7,
  4: 5,
  5: 3,
  6: 2,
  7: 1,
};

const PERFECT_TOP_10_BONUS = 50;

const SESSION_MULTIPLIER: Record<SessionKind, number> = {
  Sprint: 1,
  Qualifying: 2,
  Race: 3,
};

export function scoreSession(
  kind: SessionKind,
  top10: Top10 | null,
  prediction: Prediction | null,
): SessionScore {
  let points = 0;
  let exactHits = 0;

  prediction?.forEach((driver, index) => {
    const pickPosition = index + 1;
    const top10Position = positionInTop10(top10, driver);
    if (top10Position === undefined) return;

    const positionDifference = Math.abs(pickPosition - top10Position);
    points += BASE_POINTS + (ACCURACY_BONUS[positionDifference] ?? 0);
    if (positionDifference === 0) exactHits += 1;
  });

  if (exactHits === TOP_10_SIZE) points += PERFECT_TOP_10_BONUS;

  return { points: points * SESSION_MULTIPLIER[kind], exactHits };
}

function positionInTop10(top10: Top10 | null, driver: RegularDriverId): number | undefined {
  for (const [position, driverAtPosition] of top10 ?? []) {
    if (driverAtPosition === driver && position <= TOP_10_SIZE) return position;
  }
  return undefined;
}
