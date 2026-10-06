# Coding Standards

## Functions

Write functions as arrow functions assigned to `const`, not as `function` declarations.

```ts
// Yes
export const scoreSession = (kind: SessionKind, top10: Top10 | null): SessionScore => {
  // ...
};

// No
export function scoreSession(kind: SessionKind, top10: Top10 | null): SessionScore {
  // ...
}
```

- When the body only returns a value, use the short form without braces and `return`.
- Define a helper above the function that calls it. A `const` is not hoisted, so the file
  reads top to bottom: types, constants, helpers, then the exported function.

## Exports

Use named exports, not default exports.

```ts
// Yes
export const buildSeasonTable = (/* ... */) => {
  // ...
};

// No
const buildSeasonTable = (/* ... */) => {
  // ...
};
export default buildSeasonTable;
```

- A named export is imported under its own name, so it is the same everywhere in the code.
  Renaming or searching for it also finds every usage.

## Exceptions

Files whose tool requires a default export keep it, in the form its docs use:

- Next.js route files (`page.tsx`, `layout.tsx` and similar) use `export default function`.
- Tool configs (`next.config.ts`, `eslint.config.mjs`, `vitest.config.mts`) use
  `export default`.
