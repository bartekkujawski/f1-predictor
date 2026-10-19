import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // Better Auth reads its URL from the environment; tests never open it.
    env: { BETTER_AUTH_URL: "http://localhost:3000" },
    // The first test in each database file boots PGlite and runs every migration, while the other
    // files do the same in parallel. That takes ~4 s on a laptop and went past the 5 s default on CI.
    testTimeout: 15_000,
  },
});
