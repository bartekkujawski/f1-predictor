import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Database } from "./database";
import * as schema from "./schema";

// A fresh in-memory Postgres (PGlite) with the same migrations as Neon. Real SQL in tests, no Docker.
export const createTestDatabase = async (): Promise<Database> => {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
};
