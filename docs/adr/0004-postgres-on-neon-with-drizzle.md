# Postgres on Neon, accessed with Drizzle

The data is relational (Players, Leagues, Members, Predictions, results) and the Season Table is a
join-and-aggregate query, so we use Postgres. It is hosted on Neon's free tier, which scales to zero
instead of pausing the project and integrates with Vercel. We use Drizzle as the ORM because its
queries read like SQL and its types come from a TypeScript schema without a generation step.

## Considered Options

- **Supabase**: also Postgres, but its main extra (built-in auth) would overlap with Better Auth
  (ADR-0005), and free projects pause after a week of inactivity.
- **Prisma**: an equally valid ORM. Rejected because it hides more of the SQL, and learning SQL is a goal of this project.
- **SQLite / MongoDB**: SQLite is awkward on serverless hosting, and MongoDB is a poor fit for relational data.
