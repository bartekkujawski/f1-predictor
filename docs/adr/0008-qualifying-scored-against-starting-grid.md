# Qualifying is scored against the Starting Grid

The Qualifying Prediction is scored against the Starting Grid, not against Qualifying's own
Official Classification. The League cares about who lines up where on Sunday, and waiting for grid
penalties to land adds drama to the weekend. The cost is that a Qualifying Prediction partly
measures penalties rather than pace, and that Qualifying points only appear once the Race results
are published, because that is where the results source (Jolpica) publishes the grid.

## Consequences

- If the Race is cancelled after Qualifying, there is no Starting Grid and Qualifying becomes a
  Cancelled Session.
- Pit lane starters have grid `0` in Jolpica and score 0.
- A pit lane start decided after the grid is set leaves an empty slot, and the other drivers keep
  their numbers (Belgium 2021: Pérez qualified P7, slot 7 empty; Miami 2022: slots 10 and 13 empty).
  We score against grid numbers as published, so the Top 10 can hold fewer than ten drivers and a
  Perfect Top 10 is impossible for that Session. Closing up the gaps was rejected: it would score
  against an order nobody actually started from.
