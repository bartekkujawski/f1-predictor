# A Prediction's Picks are stored as one array, not as rows

A Prediction is one row in `prediction`, and its ten Picks are a `text[]` column in that row. Each
element is a Regular Driver's `driver_id`, and index 0 is P1. Editing a Prediction is a single
upsert, so it is atomic. The production driver, Neon over HTTP (ADR-0004), has no transactions, so a
Pick table would be edited with separate statements that delete the old Picks and insert the new
ones. If one of them failed, the database would keep a Prediction with missing Picks, which the rules
forbid ("incomplete Predictions cannot be saved", `docs/rules.md`).

The database still guards what it can: one Prediction per Player and Session (unique), and exactly
ten Picks (a `cardinality` check). The save use-case checks the rest: no driver twice, and only the
Season's Regular Drivers.

## Considered Options

- **A `pick` table** (Prediction, position → Regular Driver): more relational. Unique constraints
  could forbid a driver twice, and a foreign key would tie each Pick to a Regular Driver. Rejected
  because without transactions an edit cannot be atomic.
- **Neon over WebSockets** (`neon-serverless` with a `Pool`): supports transactions, so a Pick table
  would work. Rejected for now: it brings back connections to open and close in serverless functions,
  only to store ten values that are always read and written together.

## Consequences

- Nothing in the database ties a Pick to a Regular Driver. If a driver leaves the Regular Driver list
  (#19, Part 2 story 61), saved Picks keep the `driver_id`, and every reader must handle a Pick whose
  driver is no longer on the list.
- The array maps one-to-one onto the scoring module's `Prediction` (ten `driver_id`s in order), so no
  mapping is needed before scoring.
- Querying "who picked driver X at P1" needs array operators (`picks[1]`, `= ANY(picks)`) rather than a
  join. At this scale that is fine.
