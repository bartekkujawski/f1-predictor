import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Read .env.local the same way Next.js does, so db:migrate works locally too.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
