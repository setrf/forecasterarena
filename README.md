# Forecaster Arena

<div align="center">

**Reality-Grounded LLM Evaluation**

*Reality as the ultimate benchmark*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)](https://sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Live Demo](https://forecasterarena.com) | [API Reference](./docs/API_REFERENCE.md) | [Architecture](./ARCHITECTURE.md) | [Methodology](./docs/METHODOLOGY_v2.md)

</div>

> Documentation status: updated for the current codebase on April 30, 2026.

---

## What This Repository Does

Forecaster Arena is a reality-grounded evaluation for frontier LLMs. It uses real prediction markets from [Polymarket](https://polymarket.com), paper portfolios, and deterministic prompting as tools for testing whether models can turn forecasts about future events into measurable economic value. Every decision-eligible benchmark family receives the same market universe, the same portfolio constraints, and the same setup.

The primary ranking is **portfolio value / P&L**. Brier score and calibration views are retained as historical diagnostics for resolved markets, but they are not the core current methodology.

Historical v1 cohorts are archived. They remain publicly accessible for audit and drilldown history, but current v2 leaderboards, averages, charts, recent-decision feeds, and routine snapshot work exclude archived cohorts.

The system also keeps **full decision logs** for reproducibility.

The benchmark is intentionally built around future events so the models cannot rely on memorized benchmark answers from training corpora.

---

## Current Family Lineup

The codebase now separates **legacy model IDs**, **stable benchmark families**, and **exact releases**.

- `models.id` remains as a legacy compatibility key
- `model_families` defines the long-lived benchmark slot
- `model_releases` defines the exact deployed model
- `benchmark_configs` define the default lineup used for future cohorts and Sunday refreshes of unarchived active cohorts
- `agents.family_id`, `agents.release_id`, and `agents.benchmark_config_model_id` freeze that identity onto each cohort participant
- `decisions`, `trades`, and `brier_scores` freeze release lineage at write time so historical records remain correct after family rollovers

| Family | Legacy ID | Current Release | Provider | OpenRouter ID |
|--------|-----------|-----------------|----------|---------------|
| `openai-gpt` | `gpt-5.1` | GPT-5.5 | OpenAI | `openai/gpt-5.5` |
| `google-gemini` | `gemini-2.5-flash` | Gemini 3.1 Pro Preview | Google | `google/gemini-3.1-pro-preview` |
| `xai-grok` | `grok-4` | Grok 4.3 | xAI | `x-ai/grok-4.3` |
| `anthropic-claude-opus` | `claude-opus-4.5` | Claude Opus 4.7 | Anthropic | `anthropic/claude-opus-4.7` |
| `deepseek-v3` | `deepseek-v3.1` | DeepSeek V4 Pro | DeepSeek | `deepseek/deepseek-v4-pro` |
| `moonshot-kimi` | `kimi-k2` | Kimi K2.6 | Moonshot AI | `moonshotai/kimi-k2.6` |
| `alibaba-qwen` | `qwen-3-next` | Qwen 3.6 Max Preview | Alibaba | `qwen/qwen3.6-max-preview` |

Why this matters:

- public continuity pages use the **family**
- active and historical cohorts keep the exact **release** they started with
- legacy IDs are compatibility aliases only; lineage tables, canonical family slugs, and frozen agent/config assignments are the source of truth for historical identity
- newer OpenRouter releases are discovered through operator-approved lineup reviews; approval creates a future default config and never rolls active cohorts

---

## System Behavior

### Weekly benchmark lifecycle

1. **Market sync**
   - The app syncs Polymarket markets into SQLite.
   - The decision engine uses the **top 500 markets by volume**.

2. **Cohort creation**
   - A cohort represents one weekly competition instance.
   - Cohorts are now **week-unique** at the database level, so duplicate Sunday starts do not create parallel competitions for the same week.

3. **Decision run**
   - Active current cohorts stay live for tracking and resolution, but only the latest decision window receives new LLM calls.
   - By default, the newest `5` cohort numbers are decision-eligible through `DECISION_COHORT_LIMIT`.
   - Archived v1 cohorts never receive new LLM calls.
   - Every decision-eligible agent builds a prompt from its current portfolio plus the current market set.
   - OpenRouter calls are deterministic (`temperature = 0`).
   - The current implementation uses a **40 second per-model timeout**, **no transport retries by default**, and **1 malformed-response retry**.

4. **Trade execution**
   - Models can `BET`, `SELL`, or `HOLD`.
   - Bets are bounded by the portfolio rules in [`lib/constants.ts`](./lib/constants.ts):
     - initial balance: `$10,000`
     - minimum bet: `$50`
     - maximum single bet: `25%` of available cash

5. **Resolution and scoring**
   - Closed markets are checked for resolution on a recurring basis.
   - Positions are settled for portfolio value / P&L, which drives the primary leaderboard.
   - Brier scores may be created from recorded buy trades as historical diagnostics for resolved markets.
   - The app only marks a market `resolved` locally **after** settlements succeed, so partial failures can be retried safely.

6. **Portfolio snapshots**
   - Snapshots are timestamped, not daily-bucketed.
   - The current snapshot route records **10-minute mark-to-market state** for unarchived active cohorts using Polymarket CLOB midpoints for paper valuation.
   - If CLOB pricing is missing or invalid, snapshots preserve the prior position value, log a price anomaly, and record market-price provenance for audit.
   - Archived v1 cohorts are not routine-snapshotted; their detail pages compute live portfolio state from cash, positions, and settlement records.

---

## Safety and Integrity Guarantees

Recent changes in the codebase materially changed the system guarantees. The docs below reflect the current implementation, not the earlier behavior.

### 1. Cohorts are unique per week

- Cohorts are keyed by a normalized weekly `started_at`
- repeated or concurrent start attempts resolve to the same cohort
- agent creation is physically and semantically idempotent per `(cohort_id, benchmark_config_model_id)`

### 2. Decisions are unique per agent / cohort / week

- the database enforces a unique decision tuple
- the engine claims a single per-week decision row before any model call begins
- in-progress claims can be retried if they become stale
- reruns overwrite the claimed row instead of creating duplicate decision records

### 3. Resolution is retry-safe

- settlements now happen before the market flips to local `resolved`
- if one position settlement fails, the market stays `closed`
- the next resolution pass can continue from the remaining open positions

### 4. Public health output is intentionally redacted

`/api/health` still exposes high-level subsystem status for monitoring, but it no longer leaks exact secret names or raw database error strings to anonymous callers.

### 5. Admin export no longer shells raw user input

The admin export endpoint still produces a ZIP archive of bounded CSV exports, but the archive filename is sanitized and the ZIP process is invoked without shell interpolation.

---

## Public Site Semantics

The frontend is intentionally data-aware now:

- the home hero badge can present:
  - `Live Benchmark`
  - `Synced Preview`
  - `Awaiting First Cohort`
- the markets count on the home page is fetched from `/api/markets`
- the empty-data models page renders **all active benchmark families**, not a truncated subset
- mobile filter controls on `/markets` wrap instead of overflowing
- accessibility issues around contrast, heading order, and the mobile GitHub icon link were fixed

This matters operationally because a fresh database now reads as a synchronized preview or empty benchmark state rather than pretending live cohorts already exist.

---

## Repository Map

| Path | Purpose |
|------|---------|
| `app/` | Next.js app router pages and API routes |
| `features/` | Page-level feature modules, client shells, hooks, and feature-specific UI composition |
| `components/` | Reusable UI components and charts |
| `lib/application/` | Application-layer orchestration for routes, read models, cron flows, and admin operations |
| `lib/db/` | SQLite connection, schema, and query layer |
| `lib/engine/` | Cohort, decision, execution, and resolution engines |
| `lib/openrouter/` | OpenRouter client, prompts, parser |
| `lib/polymarket/` | Polymarket fetch / transform / resolution helpers |
| `lib/scoring/` | Portfolio value / P&L calculations and historical Brier diagnostics |
| `playwright/` | Checked-in browser smoke and interaction coverage |
| `tests/` | Vitest coverage for engines, routes, schema, and security |
| `docs/` | Reference documentation and operational runbooks |

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- `zip` available on the system path if you intend to use the admin export route

### Install

```bash
npm install
```

### Configure environment

Create `.env.local` with the variables that apply to your environment:

```bash
OPENROUTER_API_KEY=...
CRON_SECRET=...
ADMIN_PASSWORD=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_GITHUB_URL=https://github.com/setrf/forecasterarena
DATABASE_PATH=data/forecaster.db
BACKUP_PATH=backups
DECISION_COHORT_LIMIT=5
```

Notes:

- in development, `CRON_SECRET` falls back to `dev-secret`
- in development, `ADMIN_PASSWORD` falls back to `admin`
- in production, missing `CRON_SECRET` or `ADMIN_PASSWORD` fail closed

### Run locally

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build:standalone
npm run start
```

`build:standalone` runs `next build`, copies `.next/static` and `public` into
`.next/standalone`, and verifies CSS, JS, and font assets exist in the exact
tree used by the production systemd service.

Typecheck:

```bash
npm run typecheck
```

Important repo-specific note:

- this repo's `tsconfig.json` includes `.next/types/**/*.ts`
- if `.next/types` is missing, run a successful `npm run build` first

### Full verification

```bash
npm run check
npm run test:e2e
npm run test:e2e:empty
```

---

## Current Runtime Configuration

### Benchmark constants

| Setting | Current Value |
|---------|---------------|
| Initial balance | `$10,000` |
| Minimum bet | `$50` |
| Maximum single bet | `25%` of current cash |
| Top markets fed to each family | `500` |
| OpenRouter temperature | `0` |
| OpenRouter max tokens | `16,000` |
| OpenRouter timeout | `40,000 ms` |
| Malformed-response retries | `1` |
| Decision cohort window | latest `5` cohort numbers by default |

### Current time ranges for performance data

The `/api/performance-data` endpoint accepts:

- `10M`
- `1H`
- `1D`
- `1W`
- `1M`
- `3M`
- `ALL`

`cohort_id` is optional and scopes the chart to one cohort when provided.

---

## Cron Schedule

These are the schedules implied by the current code comments and runtime expectations:

| Job | Route | Expected Schedule |
|-----|-------|-------------------|
| Sync markets | `/api/cron/sync-markets` | Every 5 minutes |
| Start cohort | `/api/cron/start-cohort` | Sunday 00:00 UTC |
| Run decisions | `/api/cron/run-decisions` | Sunday 00:05 UTC |
| Check resolutions | `/api/cron/check-resolutions` | Hourly |
| Take snapshots | `/api/cron/take-snapshots` | Every 10 minutes |
| Check model lineup | `/api/cron/check-model-lineup` | Monday 09:00 UTC |
| Create backup | `/api/cron/backup` | Saturday 23:00 UTC or another low-traffic window |

All cron routes require:

```http
Authorization: Bearer {CRON_SECRET}
```

`run-decisions` only spends model calls on unarchived active cohorts inside the
latest decision window. Current v2 cohorts outside that window remain included
in snapshots, resolution checks, leaderboards, drilldowns, and audit history.
Archived v1 cohorts are settle-only: they remain linkable and can receive
settlement updates, but they are excluded from current v2 scoring, graphs,
recent decisions, lineup refreshes, and routine snapshots.
`check-model-lineup` only reads the public OpenRouter model catalog and writes
an admin review row; it does not call paid model completions or change the
future default lineup until an admin approves the review.

---

## API Overview

### Public routes

- `GET /api/health`
- `GET /api/leaderboard`
- `GET /api/performance-data`
- `GET /api/markets`
- `GET /api/markets/[id]`
- `GET /api/models/[id]`
- `GET /api/cohorts/[id]`
- `GET /api/cohorts/[id]/models/[modelId]`
- `GET /api/decisions/recent`
- `GET /api/decisions/[id]`

### Admin routes

- `POST /api/admin/login`
- `DELETE /api/admin/login`
- `GET /api/admin/stats`
- `GET /api/admin/costs`
- `GET /api/admin/logs`
- `POST /api/admin/action`
- `POST /api/admin/export`
- `GET /api/admin/export`

### Reference docs

- detailed endpoint contracts: [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md)
- architecture rulebook: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- detailed runtime architecture: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- operational runbook: [`docs/OPERATIONS.md`](./docs/OPERATIONS.md)
- security posture: [`docs/SECURITY.md`](./docs/SECURITY.md)
- schema details: [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md)

---

## Data Locations

| Path | Meaning |
|------|---------|
| `data/forecaster.db` | Default SQLite database |
| `backups/` | SQLite backup destination |
| `backups/exports/` | Generated admin CSV ZIP exports |

Admin exports:

- are bounded to **7 days**
- are capped at **50,000 rows per table**
- default to exporting:
  - `cohorts`
  - `agents`
  - `models`
  - `markets`
  - `decisions`
  - `trades`
  - `positions`
  - `portfolio_snapshots`
  - `market_price_snapshots`
- are deleted after roughly **24 hours**

---

## Documentation Map

| Document | Focus |
|----------|-------|
| [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md) | Request/response contracts for every route |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Layering rules, boundaries, and browser QA expectations |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Detailed runtime structure, data flow, and engine responsibilities |
| [`docs/OPERATIONS.md`](./docs/OPERATIONS.md) | Production checks, cron procedures, operator queries |
| [`docs/SECURITY.md`](./docs/SECURITY.md) | Auth, secrets, exposure boundaries, operational security |
| [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) | Tables, constraints, indexes, invariants |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | Decision semantics and reasoning format |
| [`docs/SCORING.md`](./docs/SCORING.md) | P&L details and historical Brier diagnostics |
| [`docs/METHODOLOGY_v2.md`](./docs/METHODOLOGY_v2.md) | Current evaluation methodology |

## Contributing

1. run `npm run check` before committing; run the Playwright suites when browser-visible behavior changes
2. update docs when behavior changes
3. keep route docs aligned with actual request / response payloads
4. prefer changing implementation and documentation in the same commit when possible

---

## License

[MIT](./LICENSE)
