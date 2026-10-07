import { drizzle } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { requireEnv } from "../env";
import * as schema from "./schema";

// Any Postgres database with our schema: Neon in the app, PGlite in tests.
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

// Neon over HTTP: one request per query, nothing to keep open between serverless calls.
export const db: Database = drizzle(requireEnv("DATABASE_URL"), { schema });
