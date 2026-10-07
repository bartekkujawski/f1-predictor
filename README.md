# F1 Predictor

Prediction league for Formula 1 fans. Friends predict race weekend results before
qualifying starts, and the app scores them automatically once results are in.

Work in progress.

## Running locally

Requires Node.js 24 (see `.nvmrc` and `engines` in `package.json`, which Vercel reads).

```sh
npm install
npm run db:migrate # apply migrations to the database in DATABASE_URL
npm run dev        # http://localhost:3000
```

### Environment variables

The app reads its secrets from environment variables. Locally, put them in `.env.local`
(ignored by git). On Vercel, set them in the project settings.

| Variable               | What it is                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Postgres connection string from Neon. The Neon integration on Vercel sets it.                 |
| `BETTER_AUTH_SECRET`   | Random secret that signs session cookies, at least 32 characters: `openssl rand -base64 32`.  |
| `BETTER_AUTH_URL`      | The app's own URL: `http://localhost:3000` locally, the production URL on Vercel.             |
| `GOOGLE_CLIENT_ID`     | OAuth client ID from Google Cloud Console (APIs & Services → Credentials).                  |
| `GOOGLE_CLIENT_SECRET` | Secret of the same OAuth client.                                                              |

The Google OAuth client needs `<BETTER_AUTH_URL>/api/auth/callback/google` as an authorized
redirect URI, for every URL the app signs in from. Preview deploys have changing URLs, so
sign-in works on production and locally.

## Database

Postgres on Neon, accessed with Drizzle (ADR-0004). The schema is in `src/db/schema.ts` and the
SQL migrations generated from it are in `drizzle/`.

```sh
npm run db:generate # after changing the schema: write a new migration to drizzle/
npm run db:migrate  # apply pending migrations to DATABASE_URL
```

Tests run against PGlite, an in-memory Postgres, with the same migrations
(`src/db/test-database.ts`), so they need no database server.

## Checks

These are the same checks CI runs on every push and pull request:

```sh
npm run typecheck  # TypeScript, after generating Next.js route types
npm run lint       # ESLint
npm test           # Vitest, single run
```

`npm run test:watch` reruns tests on file changes.

## Deployment

The app is deployed to Vercel at https://f1-predictor-omega.vercel.app/: `main` goes to production, and every pull request gets a
preview deploy.

Production deploys apply pending migrations to Neon before building (`buildCommand` in
`vercel.json`); a failed migration fails the deploy. Preview deploys skip migrations, so a pull
request never changes the production database.
