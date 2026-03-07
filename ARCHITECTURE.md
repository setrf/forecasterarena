# Architecture

This codebase keeps the product surface stable by separating routing, application orchestration, business logic, and persistence.

## Layers

- `app/`
  Thin Next.js pages and route handlers. These should parse inputs, call the appropriate feature or application module, and return UI or serialized responses.
- `features/`
  UI feature shells and reusable page-level client logic. Feature modules may compose components and hooks, but they should not import route files.
- `lib/application/`
  Use-case orchestration for read models, admin flows, cron flows, and API-facing operations. Application modules should stay framework-agnostic and should not import `next/*` or `app/*`.
- `lib/engine/`
  Core competition and trading workflows such as decisions, execution, resolution, cohort lifecycle, and market sync orchestration.
- `lib/db/`
  SQLite connection management, schema, transactions, ids, and query modules.
- `lib/openrouter/`, `lib/polymarket/`, `lib/scoring/`, `lib/utils/`
  Provider integrations, scoring helpers, parsing, and shared utility logic.

## Boundary Rules

- Route handlers in `app/api/*` should go through `lib/application/*`, not directly into low-level DB or engine internals.
- Page files in `app/*` should stay as thin wrappers around `features/*`.
- Thin public barrels should stay thin. Large internal refactors should happen behind stable entrypoints like:
  - `lib/application/cron.ts`
  - `lib/application/cohorts.ts`
  - `lib/application/markets/index.ts`
  - `lib/application/models/index.ts`
  - `lib/db/index.ts`
  - `lib/engine/decision.ts`
  - `lib/engine/execution.ts`
  - `lib/engine/resolution.ts`
  - `lib/openrouter/parser/parseDecision.ts`
  - `lib/types/entities.ts`

## Enforcement

Automated checks live in [scripts/check-architecture.mjs](/Users/mertgulsun/Desktop/forecasterarena/scripts/check-architecture.mjs).

That script currently enforces:

- line-count caps on the main public entrypoints and route/page wrappers
- import-boundary restrictions for feature modules, application modules, and thin API routes

## Browser QA

Browser smoke coverage lives in `/playwright`.

After UI refactors, the minimum browser pass should verify:

- public navigation on desktop and mobile
- a seeded model detail route
- a seeded cohort detail route and decision expansion behavior
- a seeded market detail route
- admin login plus authenticated admin costs and logs pages

The Playwright suite uses a deterministic seeded SQLite database prepared before the Next.js dev server starts. That keeps browser tests stable and avoids depending on local `data/` files.

Current browser commands:

- `npm run test:e2e` for the seeded rich-data scenario
- `npm run test:e2e:empty` for the empty-state scenario

## Practical Rule

If a file starts doing more than one of these jobs, it should probably be split:

- input parsing
- orchestration
- domain/business rules
- database access
- presentation/rendering
