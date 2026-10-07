import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // Better Auth reads its URL from the environment; tests never open it.
    env: { BETTER_AUTH_URL: "http://localhost:3000" },
  },
});
