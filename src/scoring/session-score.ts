export type SessionKind = "Sprint" | "Qualifying" | "Race";

export type RegularDriverId = string;

// Position (1–10) → Regular Driver. A missing key is an empty slot (ADR-0008).
export type Top10 = ReadonlyMap<number, RegularDriverId>;

// Ten Regular Drivers in predicted order; index 0 is P1.
export type Prediction = readonly RegularDriverId[];

export type SessionScore = { sessionScore: number; exactHits: number };

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
  let sessionScore = 0;
  let exactHits = 0;

  prediction?.forEach((driver, index) => {
    const pickPosition = index + 1;
    const finishPosition = positionInTop10(top10, driver);
    if (finishPosition === undefined) return;

    const positionDifference = Math.abs(pickPosition - finishPosition);
    sessionScore += BASE_POINTS + (ACCURACY_BONUS[positionDifference] ?? 0);
    if (positionDifference === 0) exactHits += 1;
  });

  if (exactHits === 10) sessionScore += PERFECT_TOP_10_BONUS;

  return { sessionScore: sessionScore * SESSION_MULTIPLIER[kind], exactHits };
}

function positionInTop10(top10: Top10 | null, driver: RegularDriverId): number | undefined {
  for (const [position, driverAtPosition] of top10 ?? []) {
    if (driverAtPosition === driver && position <= 10) return position;
  }
  return undefined;
}
