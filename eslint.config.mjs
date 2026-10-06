import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Code style for our own code.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Functions are arrow functions assigned to const, not function declarations.
      "func-style": ["error", "expression"],
      // Named exports keep one name for a function everywhere it is imported.
      "no-restricted-exports": [
        "error",
        { restrictDefaultExports: { direct: true, named: true, defaultFrom: true, namedFrom: true } },
      ],
      // A const is not hoisted, so helpers go above the code that uses them.
      "@typescript-eslint/no-use-before-define": "error",
    },
  },
  {
    // Next.js route files must default-export a function, as in the Next.js docs.
    files: ["src/app/**/{page,layout,loading,error,not-found,template,default,global-error}.tsx"],
    rules: {
      "func-style": "off",
      "no-restricted-exports": "off",
    },
  },
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
