import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The scoring module is pure: no framework, database or network (issue #3).
    files: ["src/scoring/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(?!\\./)",
              message: "The scoring module is pure: import only its own files (./...).",
            },
          ],
        },
      ],
    },
  },
  {
    // Tests of the scoring module may also import vitest.
    files: ["src/scoring/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(?!\\./|vitest$)",
              message: "Scoring tests may import only the module's own files (./...) and vitest.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
