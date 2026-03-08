# Forecaster Arena Architecture

Last updated: 2026-03-07

This document is the detailed runtime architecture companion to [`../ARCHITECTURE.md`](../ARCHITECTURE.md). It describes how the application currently runs in practice, while the top-level architecture doc defines the layering rules and boundaries the repository should preserve.

---

## 1. System Overview

Forecaster Arena is a Next.js 14 application that orchestrates a paper-trading benchmark over Polymarket markets.

At a high level, the system has four major layers:

1. Public web UI
   - Read-only pages for the homepage, models, cohorts, markets, methodology, changelog, and about.
   - These pages consume internal API routes for live data and render empty states when the database has not been seeded yet.

2. Admin surface
   - Cookie-authenticated operational pages under `/admin`.
   - Supports cohort/market maintenance, exports, log review, and cost review.

3. Internal orchestration APIs
   - Cron-authenticated routes under `/api/cron/*`.
   - Admin-authenticated routes under `/api/admin/*`.
   - Public read routes under `/api/*`.

4. SQLite-backed benchmark engine
   - Market synchronization from Polymarket.
   - Decision generation through OpenRouter.
   - Trade execution and settlement.
   - Snapshotting, scoring, logging, and backup.

The entire application runs from a single codebase and a single SQLite database by default.

---

## 2. High-Level Component Graph

```text
Polymarket Gamma API
        |
        v
  lib/polymarket/*
        |
        v
  lib/engine/market.ts  ------+
                              |
OpenRouter API                v
        |                SQLite / lib/db/*
        v                     ^
  lib/openrouter/*            |
        |                     |
        v                     |
  lib/engine/decision.ts -----+
        |
        v
  lib/engine/execution.ts
        |
        v
  trades / positions / agents
        |
        v
  lib/engine/resolution.ts
        |
        v
  brier_scores / snapshots / logs
        |
        v
  lib/application/*
        |
        v
  app/api/* routes
        |
        v
  app/* pages + features/* + components/*
```

---

## 3. Runtime Surfaces

### 3.1 Public Pages

Primary routes:

- `/`
- `/models`
- `/models/[id]` (`id` resolves canonical family slugs; legacy roster ids are compatibility aliases)
- `/cohorts`
- `/cohorts/[id]`
- `/cohorts/[id]/models/[familySlugOrLegacyId]` (`familySlugOrLegacyId` resolves canonical family slugs; legacy roster ids are compatibility aliases)
- `/markets`
- `/markets/[id]`
- `/decisions/[id]`
- `/methodology`
- `/about`
- `/changelog`

These pages are presentation-oriented and rely on internal API routes for benchmark data. The UI now distinguishes between:

- a live benchmark with real cohort/trade data,
- a synced preview where markets are available but cohorts have not started,
- an empty boot state with no synced markets or cohorts.

### 3.2 Public API Routes

Current public read endpoints:

- `GET /api/health`
- `GET /api/leaderboard`
- `GET /api/models/[id]`
- `GET /api/cohorts/[id]`
- `GET /api/cohorts/[id]/models/[familySlugOrLegacyId]`
- `GET /api/markets`
- `GET /api/markets/[id]`
- `GET /api/decisions/recent`
- `GET /api/decisions/[id]`
- `GET /api/performance-data`

These endpoints read from SQLite only. They do not mutate benchmark state.

### 3.3 Admin API Routes

Authenticated by signed `forecaster_admin` cookie:

- `POST /api/admin/login`
- `DELETE /api/admin/login`
- `GET /api/admin/stats`
- `GET /api/admin/logs`
- `GET /api/admin/costs`
- `GET /api/admin/benchmark`
- `POST /api/admin/benchmark/releases`
- `POST /api/admin/benchmark/configs`
- `POST /api/admin/benchmark/default`
- `POST /api/admin/action`
- `POST /api/admin/export`
- `GET /api/admin/export`

Admin routes are also rate-limited by middleware.

### 3.4 Cron API Routes

Authenticated by `Authorization: Bearer <CRON_SECRET>`:

- `POST /api/cron/start-cohort`
- `POST /api/cron/run-decisions`
- `POST /api/cron/sync-markets`
- `POST /api/cron/check-resolutions`
- `POST /api/cron/take-snapshots`
- `POST /api/cron/backup`

The code does not embed a scheduler. Cron timing is an operational concern and is documented in `docs/OPERATIONS.md`.

### 3.5 Browser QA Surface

Checked-in Playwright smoke coverage lives under `playwright/`.

That suite runs against a deterministic seeded SQLite database prepared specifically for browser testing. It validates the user-facing contract that unit tests do not fully cover:

- public route rendering
- mobile navigation behavior
- seeded dynamic detail routes
- admin login and authenticated admin pages

The browser layer currently has two seeded scenarios:

- rich-data smoke coverage via `npm run test:e2e`
- empty-state smoke coverage via `npm run test:e2e:empty`

---

## 4. Core Subsystems

### 4.1 Database Layer

Key files:

- `lib/db/index.ts`
- `lib/db/schema.ts`
- `lib/db/queries/*.ts`

Responsibilities:

- Initialize the SQLite database.
- Enforce foreign keys and WAL mode.
- Seed baseline models and methodology metadata.
- Expose CRUD and aggregate queries.
- Provide both normal and immediate transactions.

Important current behavior:

- `withTransaction()` is used for normal atomic write groups.
- `withImmediateTransaction()` is used for lock-first workflows that must serialize competing writers, such as decision claims and week-unique cohort creation.

### 4.2 Market Synchronization

Key files:

- `lib/polymarket/api.ts`
- `lib/polymarket/aggregates.ts`
- `lib/polymarket/transformers.ts`
- `lib/engine/market.ts`

Responsibilities:

- Fetch top markets from Polymarket.
- Re-check locally relevant markets for status changes.
- Upsert normalized market records into SQLite.

Current behavior:

- Top market ingestion is volume-based and capped by `TOP_MARKETS_COUNT`.
- Existing active/closed markets with open positions are revisited so status changes do not depend solely on the “top markets” window.

### 4.3 Decision Generation

Key files:

- `lib/openrouter/client.ts`
- `lib/openrouter/prompts.ts`
- `lib/openrouter/parser.ts`
- `lib/engine/decision.ts`

Responsibilities:

- Build the model prompt from portfolio state, open positions, and current market set.
- Call OpenRouter with deterministic settings.
- Validate structured JSON responses.
- Persist decision logs and hand off trades to the execution engine.

Current execution model:

- Decisions run sequentially per cohort.
- Each model call is capped by `LLM_TIMEOUT_MS = 40000`.
- Transport-level retries are disabled by default in `callOpenRouterWithRetry(..., retries = 0)`.
- Parse-level retries remain enabled through `LLM_MAX_RETRIES = 1`.

Why the decision path changed:

- The system now claims exactly one decision row per `(agent_id, cohort_id, decision_week)` before any model call starts.
- This prevents overlapping cron runs from inserting multiple decision rows and executing duplicate trades.

### 4.4 Trade Execution

Key file:

- `lib/engine/execution.ts`

Responsibilities:

- Validate BET and SELL instructions.
- Resolve executable price from market state.
- Update positions, trades, and agent balances.

Current rules:

- Max single bet is `25%` of current cash balance.
- Binary markets store the traded side explicitly as `YES` or `NO`.
- Multi-outcome markets use the named outcome string as the stored side.

### 4.5 Resolution and Settlement

Key file:

- `lib/engine/resolution.ts`

Responsibilities:

- Poll unresolved markets that are locally marked `closed`.
- Detect resolution via Polymarket.
- Settle open positions and record Brier scores.
- Complete cohorts once no open positions remain.

Important current ordering:

1. Detect external winner.
2. Settle all currently open positions for that market.
3. If any settlement fails, keep the market `closed` locally so the next run can retry.
4. Only after all settlements succeed, mark the market `resolved`.

This ordering was introduced specifically to avoid stranding open positions on a market that can no longer be revisited.

### 4.6 Snapshotting and Scoring

Key files:

- `app/api/cron/take-snapshots/route.ts`
- `lib/db/queries/snapshots.ts`
- `lib/scoring/pnl.ts`
- `lib/scoring/brier.ts`

Responsibilities:

- Mark positions to market.
- Persist timestamped portfolio snapshots.
- Maintain portfolio-level P/L series and Brier history.

Important current behavior:

- Snapshots are timestamped with `snapshot_timestamp`, not a daily `snapshot_date`.
- Snapshots are intended to be taken on a 10-minute cadence.
- Closed-but-unresolved positions retain prior value when live feeds would incorrectly collapse them to zero.
- Snapshot upserts are unique on `(agent_id, snapshot_timestamp)`.

---

## 5. State Machines

### 5.1 Cohort Lifecycle

States:

- `active`
- `completed`

Rules:

- A cohort is identified by `cohort_number`, but week uniqueness is enforced by `started_at`.
- `started_at` is normalized to the current week start (Sunday 00:00 UTC).
- `createCohort()` is idempotent for the current week.
- `checkAndCompleteCohorts()` marks a cohort completed once it has at least one decision and zero open positions.

### 5.2 Decision Lifecycle

States are represented implicitly by row contents rather than a dedicated enum column:

1. Claimed / in-progress
   - A decision row exists.
   - `action = 'ERROR'`
   - `error_message = '__IN_PROGRESS__'`
   - placeholder prompts are written to reserve the slot.

2. Finalized success
   - `action` becomes `BET`, `SELL`, or `HOLD`.
   - prompt/response fields are replaced with real values.

3. Finalized error
   - `action = 'ERROR'`
   - `error_message` contains the failure reason.

Retry behavior:

- If the prior row is a completed BET/SELL with zero recorded trades, the same row can be reclaimed and overwritten.
- If the prior row is a stale in-progress placeholder, it can also be reclaimed.
- This keeps one canonical decision row per agent/week while still allowing safe reruns.

### 5.3 Market Lifecycle

States:

- `active`
- `closed`
- `resolved`
- `cancelled` is represented as `resolved` with `resolution_outcome = 'CANCELLED'`

Rules:

- Sync moves markets between `active` and `closed`.
- Resolution processing consumes only `closed` markets.
- Unknown/undeterminable winners are handled as `CANCELLED`.

---

## 6. Authentication and Request Protection

### 6.1 Cron Authentication

Implemented in `lib/api/cron-auth.ts`.

- Production fails closed if `CRON_SECRET` is missing.
- Requests must supply `Authorization: Bearer <CRON_SECRET>`.
- Comparison uses constant-time string comparison.

### 6.2 Admin Authentication

Implemented across:

- `app/api/admin/login/route.ts`
- `lib/auth.ts`
- `lib/api/admin-route.ts`

Current model:

- Password-only login.
- Signed session cookie named `forecaster_admin`.
- Cookie is `httpOnly`, `sameSite=lax`, `secure` in production, and valid for 7 days.

### 6.3 Middleware Rate Limiting

Implemented in `middleware.ts`.

Current limits:

- Admin login: 5 POST requests per minute per IP.
- Cron POST routes: 10 requests per minute per IP.
- Other admin API routes: 30 requests per minute per IP.

This limiter is in-memory and single-instance only. It is intentionally lightweight, but it is not a distributed rate limit.

---

## 7. Public Health Model

`GET /api/health` is public.

It reports subsystem status for:

- database reachability,
- environment completeness,
- basic data integrity.

Current privacy behavior:

- It does not reveal exact missing secret names.
- It does not expose raw database exception strings.
- It returns generic subsystem messages such as `Required configuration is incomplete`.

This route is suitable for uptime monitoring, but not as a verbose debugging endpoint.

---

## 8. Export Pipeline

`POST /api/admin/export` creates a capped CSV export and packages it into a ZIP archive.

Current behavior:

- Admin-authenticated only.
- Max date window: 7 days.
- Max rows per table: 50,000.
- Export files are generated in a temporary directory.
- CSVs are written synchronously before archiving.
- Archive creation uses `spawnSync('zip', ['-j', ...])` with argv, not shell interpolation.
- Output filenames are sanitized to alphanumeric / `_` / `-`.
- Old export archives are cleaned after roughly 24 hours.

This matters architecturally because the export route is one of the few places that bridges application data into filesystem artifacts.

---

## 9. Recommended Operational Schedule

The code is schedule-agnostic, but the repository’s intended cadence is:

- Market sync: every 5 minutes
- Resolution checks: every hour
- Snapshots: every 10 minutes
- Start cohort: Sunday 00:00 UTC
- Run decisions: Sunday 00:05 UTC
- Backup: Saturday 23:00 UTC

These timings are documented operationally in `docs/OPERATIONS.md`.

---

## 10. Key Invariants

These are the most important invariants the code currently relies on:

1. One cohort start per week
   - Enforced by unique `started_at`.

2. One frozen benchmark slot per cohort participant
   - Physically enforced by the legacy unique key `(cohort_id, model_id)`.
   - Semantically carried by `agents.family_id`, `agents.release_id`, and `agents.benchmark_config_model_id`.

3. One open position per `(agent, market, side)`
   - Enforced by unique `(agent_id, market_id, side)`.

4. One canonical decision row per agent/week
   - Enforced by unique `(agent_id, cohort_id, decision_week)`.

5. One snapshot per agent/timestamp
   - Enforced by unique `(agent_id, snapshot_timestamp)`.

6. A market is not locally marked resolved until settlement succeeds
   - Enforced by resolution ordering.

---

## 11. File Map

Primary architecture files:

- `app/api/*` for HTTP surfaces
- `app/*` for thin route/page wrappers
- `features/*` for page-level UI flows and feature composition
- `components/*` for shared presentational UI
- `lib/constants.ts` for runtime config
- `lib/application/*` for route-facing orchestration and read models
- `lib/db/*` for persistence
- `lib/engine/*` for benchmark orchestration
- `lib/openrouter/*` for model I/O
- `lib/polymarket/*` for market I/O
- `lib/scoring/*` for P/L and Brier logic
- `middleware.ts` for request protection

---

## 12. Related Documentation

- `docs/API_REFERENCE.md`
- `docs/OPERATIONS.md`
- `docs/SECURITY.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/DECISIONS.md`
- `docs/SCORING.md`
