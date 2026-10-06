export type SessionKind = "Sprint" | "Qualifying" | "Race";

export type RegularDriverId = string;

// Position (1–10) → Regular Driver. A missing key is an empty slot (ADR-0008).
export type Top10 = ReadonlyMap<number, RegularDriverId>;

// Ten Regular Drivers in predicted order; index 0 is P1.
export type Prediction = readonly RegularDriverId[];

export type SessionResult = { sessionScore: number; exactHits: number };

const BASE_POINTS = 5;
const EXACT_HIT_BONUS = 20;

export function scoreSession(
  kind: SessionKind,
  top10: Top10 | null,
  prediction: Prediction | null,
): SessionResult {
  let sessionScore = 0;
  let exactHits = 0;

  prediction?.forEach((driver, index) => {
    if (top10?.get(index + 1) === driver) {
      sessionScore += BASE_POINTS + EXACT_HIT_BONUS;
      exactHits += 1;
    }
  });

  return { sessionScore, exactHits };
}
