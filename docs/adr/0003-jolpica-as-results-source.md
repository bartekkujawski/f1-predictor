# Jolpica as the source of schedule and results

Session times and Official Classifications come from the Jolpica F1 API (Ergast-compatible,
`api.jolpi.ca`). It is free and needs no API key, and it covers the schedule (including Sprint
Qualifying start times), Qualifying, Sprint and Race results.

## Consequences

- Data is licensed CC BY-NC-SA 4.0 and only for non-commercial use, with no guarantee of uptime or
  correctness. That is fine for a private league and a portfolio project, but it would have to be
  revisited if the app ever became commercial.
- Rate limit: 500 requests/hour unauthenticated, and requests must send a descriptive `User-Agent`.
- Sprint Qualifying classification is not published, which is why Sprint Qualifying is not predicted.
- There is no documented policy for post-race corrections. We refresh results until the next Round starts (see `docs/rules.md`).
