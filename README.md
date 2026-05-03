# Forecaster Arena

**Reality-grounded LLM evaluation.** Frontier model families make paper-portfolio
decisions on unsettled Polymarket events. Real-world outcomes settle the score.

[Live](https://forecasterarena.com) | [Methodology](./docs/METHODOLOGY_v2.md) | [API](./docs/API_REFERENCE.md) | [Ops](./docs/OPERATIONS.md)

## Core Model

- Current v2 ranking is **portfolio value / P&L**.
- Prediction markets provide public questions, timestamped prices, and external
  resolution criteria; they are the measurement substrate, not the product goal.
- Every cohort freezes its model lineup, prompt rules, bankroll, market universe,
  decisions, trades, and release lineage.
- Archived v1 cohorts remain linkable for audit but do not affect current v2
  leaderboards, averages, charts, recent decisions, or routine snapshots.
- New exact model releases are detected by a weekly OpenRouter review and require
  explicit admin approval. Approval affects future cohorts only.

## Runtime Rules

| Area | Current behavior |
|---|---|
| App | Next.js 14, TypeScript, SQLite, single-node deployment |
| Ranking | `cash + marked_position_value`, then P&L |
| Bankroll | `$10,000` per agent per cohort |
| Trades | `BET`, `SELL`, `HOLD`; min bet `$50`; max single bet `25%` cash |
| Market universe | top Polymarket markets by volume |
| Decisions | latest `DECISION_COHORT_LIMIT` cohort numbers only, default `5` |
| Snapshots | every 10 minutes for unarchived active cohorts |
| Pricing | CLOB midpoint is accounting authority; Gamma is catalog/context |
| Model calls | OpenRouter, `temperature = 0`, exact IDs, frozen per cohort |
| Archive policy | v1 is settle-only and excluded from current v2 aggregate surfaces |

## Code Map

| Path | Purpose |
|---|---|
| `app/` | thin Next.js pages and route handlers |
| `features/` | page-level UI shells and client state |
| `components/` | shared UI and chart primitives |
| `lib/application/` | route/admin/cron orchestration and read models |
| `lib/engine/` | cohort, decision, execution, market sync, resolution |
| `lib/db/` | SQLite schema, migrations, queries, transactions |
| `lib/openrouter/` | prompts, client, parser |
| `lib/polymarket/` | Gamma/CLOB/resolution clients and transforms |
| `lib/pricing/` | CLOB-validated market pricing |
| `lib/scoring/` | P&L and historical diagnostics |
| `tests/`, `playwright/` | Vitest and browser coverage |

Layering rules live in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Local Setup

```bash
npm install
cp .env.example .env.local # if present; otherwise create .env.local
npm run dev
```

Minimum useful `.env.local`:

```bash
OPENROUTER_API_KEY=...
CRON_SECRET=...
ADMIN_PASSWORD=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DATABASE_PATH=data/forecaster.db
BACKUP_PATH=backups
DECISION_COHORT_LIMIT=5
```

Development fallbacks exist for cron/admin secrets; production fails closed when
required secrets are missing.

## Verification

```bash
npm run typecheck
npm run check:architecture
npm run check:queries
npm run test
npm run test:coverage
npm run build:standalone
npm run test:e2e
npm run test:e2e:empty
npm run check:openrouter-lineup
npm run check:openrouter-upgrades
```

`build:standalone` also verifies production asset layout so CSS/JS/font files are
present in `.next/standalone`.

## Cron Endpoints

All cron routes require:

```http
Authorization: Bearer {CRON_SECRET}
```

| Route | Typical cadence |
|---|---|
| `POST /api/cron/sync-markets` | every 5 minutes |
| `POST /api/cron/start-cohort` | Sunday 00:00 UTC |
| `POST /api/cron/run-decisions` | Sunday 00:05 UTC |
| `POST /api/cron/check-resolutions` | hourly |
| `POST /api/cron/take-snapshots` | every 10 minutes |
| `POST /api/cron/check-model-lineup` | Monday 09:00 UTC |
| `POST /api/cron/backup` | low-traffic weekly window |

Do not call `run-decisions` casually in production; it spends OpenRouter credits.

## Data

| Path | Meaning |
|---|---|
| `data/forecaster.db` | default SQLite database |
| `backups/` | SQLite backups |
| `backups/exports/` | temporary admin CSV ZIP exports |

Production state should live outside immutable release directories.

## Docs

Start with [docs/README.md](./docs/README.md). Current docs should be concise,
linked, and operationally necessary. Historical plans and audits should be kept
only when they are still needed for auditability; otherwise remove them.

## License

[MIT](./LICENSE)
