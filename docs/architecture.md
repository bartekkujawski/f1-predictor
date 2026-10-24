# Architecture

How the code is layered, where a new piece goes, and how it is tested. The reasons behind each
decision live in `docs/adr/`; this file points to them.

## Layers

From the inside out:

1. **Scoring** (`src/scoring/`): pure functions over the rules in `docs/rules.md`. No database,
   framework, network or time; ESLint enforces it. Rule constants sit next to the functions
   (ADR-0001). Scores are computed on every read, never stored (ADR-0007).
2. **Use-cases** (`src/<module>/<name>.ts`): every game rule that involves data or time is enforced
   here: Lock, visibility, membership, the App Admin role, Final Round.
3. **Delivery** (`src/app/`, each module's `actions.ts` and `*.tsx`): thin. Resolves the signed-in
   Player, calls a use-case, renders its outcome. It may hide a control (`isPlayerAppAdmin`), but the
   use-case still checks the rule itself.

## Code layout

- **UI primitives** (`src/ui/`): badge, button, card, menu, navigation. Presentation only: they know
  nothing of the domain and take plain props. They may use the framework (`next/link`, and
  `usePathname` to mark the current link), since the framework is not the domain.
- **Domain components** live in their domain module next to its use-cases (`src/calendar/calendar-view.tsx`,
  `src/calendar/session-status-badge.tsx`, `src/calendar/lock-countdown.tsx`, `src/prediction/prediction-form.tsx`).
  They word what a use-case decided; they never decide it, e.g. the badge renders the Session status from the outcome.
  One exception, for display only: the Lock countdown turns an Open badge into Locked at the Lock without a reload.
  It applies the shared rule (`lockStateAt`) to the browser's time, and the save use-case still refuses a late save.
- **The app frame** (`src/app/layout.tsx`, `src/app/app-header.tsx`): the main navigation (bottom bar
  on narrow screens, header links on wide ones), the Player's menu, and the 640 px content column.

Dependencies point one way: **pages → domain modules → UI primitives**. UI primitives never import a
domain module, and domain modules never import from `src/app/`; ESLint enforces both.

## Use-case shape

```ts
export const getSeasonTable = async ({ db, clock }: SeasonTableDependencies, playerId: string): Promise<SeasonTableOutcome>
```

- **Dependencies first, as one object** (`db`, `clock`, `resultsSource`, `appAdminEmails`), so a test
  passes fakes and production passes the real ones.
- **The acting `playerId` as an argument.** A use-case never reads the auth session.
- **An outcome union keyed by `status`** for every expected refusal (`{ status: "refused" }`,
  `{ status: "not-a-member" }`). Throw only when an invariant is broken or a dependency fails.

## Files in a module

| File | Holds |
| ---- | ----- |
| `<name>.ts` | Use-cases and their types. |
| `current-<module>.ts` | Binds production dependencies (`db`, `systemClock`, `appAdminEmails`, Jolpica) to the use-cases. Pages and actions call these. |
| `actions.ts` | `"use server"`. One `<verb>FromForm(previous, form)` per form: signed-in Player, use-case, outcome mapped to a `{ message } \| null` report. |
| `<name>-form.tsx` | `"use client"`. `useActionState` over the action, a pending button, the report in `role="alert"`. |

A page (`src/app/**/page.tsx`) calls `getSignedInPlayer`, then a `current-*` function, and branches
on `outcome.status`.

## Where shared rules live

Look here before writing a rule; a second copy is a review finding.

| Rule | Home |
| ---- | ---- |
| Lock (whether a Session accepts Predictions) | `lockStateAt` in `src/calendar/lock.ts` |
| Which order a Session is scored against (ADR-0008) | `src/calendar/session.ts` |
| Session status (open, locked, scored and whether provisionally, cancelled), shown on every page | `sessionStatusAt` in `src/calendar/session.ts` |
| Final Round, start of the next Round | `src/calendar/round.ts` |
| The Season a moment belongs to | `src/calendar/season.ts` |
| App Admin role | `src/app-admin/app-admin.ts` |
| Session Score, Season Table ranking | `src/scoring/` |

## Ports

- **ResultsSource** (`src/results-source/results-source.ts`): the schedule, Regular Drivers and Race
  results. Jolpica in production (ADR-0003), `createFakeResultsSource` in tests. How Jolpica's data
  maps to the domain: ADR-0002 (Regular Drivers) and ADR-0008 (Starting Grid).
- **Clock** (`src/clock/clock.ts`): "now". `systemClock` in production, `fixedClock` in tests.
  Use-cases ask the Clock, never `new Date()`.
- **Database** (`src/db/`): Drizzle over Neon in production (ADR-0004), PGlite in tests, same
  migrations.

## Tests

Tests go through a module's public interface and assert on outcomes, not on SQL or internal calls.

- **Use-cases:** integration tests on `createTestDatabase()` (in-memory PGlite with the real
  migrations) and `fixedClock`. Build test data through the use-cases production uses (`refresh` with
  `createFakeResultsSource`, `createLeague`, `joinLeague`). Insert directly only what no use-case
  creates: Players, which Better Auth creates at sign-in. `src/league/season-table.test.ts` is a full
  example.
- **Scoring:** unit tests, with cases taken from `docs/rules.md`.
- **Jolpica adapter:** real API responses saved in `src/results-source/fixtures/`. Capture new ones
  from the live API rather than writing them by hand: hand-written fixtures once missed the
  practice-only drivers in the Season driver list. The suite makes no network calls.
- **Pages:** `renderToStaticMarkup`, with `vi.mock` on `signed-in-player` and the `current-*`
  modules (`src/app/page.test.tsx`). Assert on the text a reader sees, not on classes. The root layout is tested the same way
  (`src/app/layout.test.tsx`), with `next/font` and `usePathname` mocked; it also covers which
  navigation link is marked current.
- **Client forms and the Better Auth wiring** hold no rules, so they have no tests; typecheck and
  lint cover them.
