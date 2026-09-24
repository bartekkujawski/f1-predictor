# Host on Vercel; schedule result fetching with GitHub Actions

The app runs on Vercel's free plan. That plan limits cron jobs to once a day, and we want to fetch
results about every 30 minutes, so a scheduled GitHub Actions workflow calls a protected API route
instead. The route is authenticated with a secret token. The App Admin can also trigger a refresh
manually.

## Consequences

- GitHub may delay scheduled runs by several minutes. That is acceptable for results.
