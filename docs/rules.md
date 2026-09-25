# Game rules

The rules of the prediction game, agreed with the League after the discovery questionnaire
(`docs/discovery/`). Terms are defined in `CONTEXT.md`. Where the two friends' answers disagreed, the
author cast the deciding vote.

One ruleset applies to every League. Rules are not configurable per League.

## What is predicted

- Every Round: a **Qualifying** Prediction and a **Race** Prediction.
- Sprint Weekends: additionally a **Sprint** Prediction.
- Sprint Qualifying is not predicted (the results source does not publish its classification).
- Each Prediction is the Top 10: ten different Regular Drivers in order. Incomplete Predictions cannot be saved.
- Each Session is predicted separately. Missing Prediction → 0 points for that Session only.

## Lock

- A Prediction can be edited any number of times until its Session's Lock, and never after.
- Qualifying and Race lock at the start of Qualifying.
- Sprint locks at the start of Sprint Qualifying.
- On a normal Round there is a single Lock for the whole Round.

## Visibility

- Before Lock, a Player sees only their own Prediction.
- From the Lock of a Session, everyone's Predictions for that Session are visible to League Members.
- This is enforced on the server: other Players' Predictions are never sent to the client before Lock.

## Scoring a Pick

Only drivers in the Top 10 of the Official Classification score. A driver who retired but is still
classified in the Top 10 counts; unclassified, did-not-start and disqualified drivers score 0.

For Qualifying, the Top 10 is taken from the **Starting Grid** instead (see ADR 0008):

- Grid penalties count, and Qualifying points are only known once the Race results are published.
- Pit lane starters have no grid position and score 0.
- A grid slot left empty by a pit lane starter stays empty; nobody moves up. The Top 10 then has
  fewer than ten drivers, and a Perfect Top 10 is impossible for that Session.

Points for a Pick = **5 Base Points** + **Accuracy Bonus**:

| Position Difference | Accuracy Bonus |
| ------------------- | -------------- |
| 0                   | +20            |
| 1                   | +14            |
| 2                   | +10            |
| 3                   | +7             |
| 4                   | +5             |
| 5                   | +3             |
| 6                   | +2             |
| 7                   | +1             |
| 8+                  | 0              |

Driver outside the Top 10 → 0.

Examples:

- Pick P2, finishes P2 → 5 + 20 = 25
- Pick P2, finishes P4 → 5 + 10 = 15
- Pick P2, finishes P10 → 5 + 0 = 5
- Pick P2, finishes P14 or DNF → 0

## Session Score

1. Sum the points of all ten Picks.
2. **Perfect Top 10** (all ten are Exact Hits): +50.
3. Multiply by the Session Multiplier:

| Session    | Multiplier | Max Session Score |
| ---------- | ---------- | ----------------- |
| Sprint     | ×1         | 300               |
| Qualifying | ×2         | 600               |
| Race       | ×3         | 900               |

All points are whole numbers.

## Substitutions

A Prediction names Regular Drivers only. If a substitute races in place of a Regular Driver in a
Round, the App Admin records a Substitution and the substitute's result counts for Picks of that
Regular Driver. A permanent seat change mid-season updates the Regular Driver list from that Round on.

## Results and corrections

- Results are fetched automatically after each Session and refreshed until the next Round starts,
  so post-race penalties are reflected.
- Once the next Round starts, the Round is a Final Round and its scores no longer change.
- Cancelled Session (no Official Classification): nobody scores. A Session with an Official
  Classification is scored normally, even if it was shortened.
- If the Race is cancelled after Qualifying, there is no Starting Grid, so Qualifying is a
  Cancelled Session too.

## Season Table

- Per League: sum of all Session Scores in the Season.
- Tie-break: more Exact Hits; if still tied, Members share the position.
- Players who join mid-season start from 0 and cannot predict past Sessions.
- Clicking a Member shows the breakdown per Round and Session, with Predictions next to results.

## Leagues

- A Player can be a Member of many Leagues; their Predictions count in all of them.
- A Player joins with the League's Join Code, typed in or opened as a link.
- The League Admin (the creator) can regenerate the Join Code, which invalidates the old one, and can remove Members.

## Rejected

- **Scoring Qualifying against its Official Classification**: the Starting Grid is what the League
  actually cares about, and waiting for grid penalties to land adds drama to the weekend.
- **Closing up empty grid slots so the Qualifying Top 10 always has ten drivers**: it would score
  against an order that nobody actually started from.
- **Up to 3 changes to the Race Prediction after Qualifying**: seeing the Qualifying result before
  predicting the Race is exactly what locking early is meant to prevent.
- **Half points (×0.5) instead of 0 for a missing Prediction**: with no Prediction there is nothing
  to halve, and copying the previous Round's Prediction goes against each track being different.
- **Tie-break by earliest Prediction**: rewards speed, not accuracy, and is unclear over a whole
  Season (which Prediction counts, and is it the first save or the last edit?).
- **Scoring 20 / 10 / "10 minus difference"**: contradicts itself (the formula gives 9 for a
  difference of 1, not 10) and does not say what a driver outside the Top 10 scores.
- **Hiding Predictions until the Race starts**: only needed with changes after Qualifying, which
  were rejected. Once a Session locks, there is nothing left to copy.

## Deferred

- **Win Streak** bonus (Exact Hit on the same driver at the same position in consecutive Races).
  Deferred because it makes a Round's score depend on the previous Round.
- Sprint Qualifying predictions. Would need a results source that publishes its classification.
