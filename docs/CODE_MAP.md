# Forecaster Arena Code Map

Last updated: 2026-04-22

This document is a repo-wide code map with a runtime-internals bias. It is meant to help an engineer answer four questions quickly:

1. What does the product do today?
2. Which use cases exist in the live route surface?
3. Which modules implement each runtime path?
4. Which behaviors are guaranteed by schema, transactions, tests, or only by convention?

Verification note:

- This document is based on static analysis of the repository, route surface, schema, docs, and tests.
- Validation for this update: `npm run typecheck` passed on 2026-04-22.
- Behaviors directly evidenced by code and tests are treated as confirmed. Behaviors described by composed source paths but not directly exercised in tests should be read as inferred from source.

## Project Model

Forecaster Arena is a single Next.js 14 application that runs a v2 paper-trading benchmark over Polymarket markets. It compares one agent per active benchmark family in weekly cohorts, using deterministic OpenRouter prompting, simulated trade execution, timestamped portfolio snapshots, and portfolio-value ranking.

Primary actors:

- Public visitor: browses model rankings, cohort outcomes, market detail, methodology, and recent decisions.
- Admin operator: authenticates with a cookie-backed admin session and can inspect stats, costs, logs, exports, and benchmark lineup state.
- External scheduler: calls cron-authenticated mutation routes for sync, cohort start, decisions, resolution, snapshots, and backup.
- External providers: Polymarket provides market data and resolution inputs; OpenRouter provides model execution.

Core product semantics:

- Competition unit: one weekly cohort, normalized to Sunday `00:00 UTC`.
- Competitor identity: one frozen agent per active benchmark family slot per cohort.
- Decision cadence: one decision per agent per cohort week, with claim-based retry handling.
- Measurement: portfolio value / PnL as the primary v2 ranking signal, with timestamped equity curves and historical Brier diagnostics from resolved buy trades.

## Use-Case And Surface Map

### Public browsing and discovery

| Use case | Entrypoint | Primary data source | Main downstream modules |
|---|---|---|---|
| Home dashboard with benchmark summary, market count, chart, and recent decisions | [`/`](../app/page.tsx) | `/api/leaderboard`, `/api/markets`, `/api/performance-data`, `/api/decisions/recent` | [`features/home`](../features/home), [`components/decision-feed`](../components/decision-feed), [`lib/application/leaderboard.ts`](../lib/application/leaderboard.ts), [`lib/application/performance.ts`](../lib/application/performance.ts) |
| Models list and current rankings | [`/models`](../app/models/page.tsx) | `/api/leaderboard` | [`features/models/list`](../features/models/list), [`lib/application/leaderboard.ts`](../lib/application/leaderboard.ts), [`lib/catalog/public.ts`](../lib/catalog/public.ts) |
| Cohorts list | [`/cohorts`](../app/cohorts/page.tsx) | `/api/leaderboard` | [`features/cohorts/list`](../features/cohorts/list), [`lib/application/leaderboard.ts`](../lib/application/leaderboard.ts) |
| Markets list with filters, search, sort, and pagination | [`/markets`](../app/markets/page.tsx) | `/api/markets` | [`features/markets/list`](../features/markets/list), [`lib/application/markets/listMarkets.ts`](../lib/application/markets/listMarkets.ts), [`lib/application/markets/queries`](../lib/application/markets/queries) |
| Methodology, about, changelog pages | [`/methodology`](../app/methodology/page.tsx), [`/about`](../app/about/page.tsx), [`/changelog`](../app/changelog/page.tsx) | static page content | [`features/methodology`](../features/methodology), [`features/about`](../features/about), [`features/changelog`](../features/changelog) |

### Drilldowns and detail views

| Use case | Entrypoint | Primary data source | Main downstream modules |
|---|---|---|---|
| Model family detail, including cohort history and recent decisions | [`/models/[id]`](../app/models/[id]/page.tsx) | `/api/models/[id]` or server-prefetched application payload | [`features/models/detail`](../features/models/detail), [`lib/application/models/getModelDetail.ts`](../lib/application/models/getModelDetail.ts), [`lib/application/models/queries`](../lib/application/models/queries) |
| Cohort detail with agent standings and curves | [`/cohorts/[id]`](../app/cohorts/[id]/page.tsx) | `/api/cohorts/[id]` or server-prefetched application payload | [`features/cohorts/detail`](../features/cohorts/detail), [`lib/application/cohorts/getCohortDetail.ts`](../lib/application/cohorts/getCohortDetail.ts), [`lib/application/cohorts/shared`](../lib/application/cohorts/shared) |
| Family-within-cohort detail | [`/cohorts/[id]/models/[familySlugOrLegacyId]`](../app/cohorts/[id]/models/[familySlugOrLegacyId]/page.tsx) | `/api/cohorts/[id]/models/[familySlugOrLegacyId]` or server-prefetched application payload | [`features/cohorts/model-detail`](../features/cohorts/model-detail), [`lib/application/cohorts/getAgentCohortDetail.ts`](../lib/application/cohorts/getAgentCohortDetail.ts) |
| Market detail with positions, trades, and historical Brier diagnostics | [`/markets/[id]`](../app/markets/[id]/page.tsx) | `/api/markets/[id]` or server-prefetched application payload | [`features/markets/detail`](../features/markets/detail), [`lib/application/markets/getMarketDetail.ts`](../lib/application/markets/getMarketDetail.ts) |
| Decision detail with raw decision/trade context | [`/decisions/[id]`](../app/decisions/[id]/page.tsx) | `/api/decisions/[id]` or server-prefetched application payload | [`features/decisions/detail`](../features/decisions/detail), [`lib/application/decisions.ts`](../lib/application/decisions.ts) |

### Monitoring and public API use cases

| Use case | Entrypoint | Primary data source | Main downstream modules |
|---|---|---|---|
| Health probe | [`GET /api/health`](../app/api/health/route.ts) | direct DB and env checks | [`lib/application/health.ts`](../lib/application/health.ts) |
| Aggregate leaderboard | [`GET /api/leaderboard`](../app/api/leaderboard/route.ts) | leaderboard and cohort query modules | [`lib/application/leaderboard.ts`](../lib/application/leaderboard.ts), [`lib/db/queries/leaderboard.ts`](../lib/db/queries/leaderboard.ts) |
| Performance chart data | [`GET /api/performance-data`](../app/api/performance-data/route.ts) | snapshot query and chart aggregation | [`lib/application/performance.ts`](../lib/application/performance.ts), [`lib/application/models/helpers/equityCurve.ts`](../lib/application/models/helpers/equityCurve.ts) |
| Recent decision feed | [`GET /api/decisions/recent`](../app/api/decisions/recent/route.ts) | recent decision read model | [`lib/application/decisions.ts`](../lib/application/decisions.ts) |

### Admin operations

| Use case | Entrypoint | Primary data source | Main downstream modules |
|---|---|---|---|
| Admin login and session restore | [`/admin`](../app/admin/page.tsx), [`POST /api/admin/login`](../app/api/admin/login/route.ts) | password check and signed cookie | [`features/admin/dashboard`](../features/admin/dashboard), [`lib/auth/adminSession.ts`](../lib/auth/adminSession.ts), [`lib/api/admin-route.ts`](../lib/api/admin-route.ts) |
| Dashboard stats and quick actions | [`GET /api/admin/stats`](../app/api/admin/stats/route.ts), [`POST /api/admin/action`](../app/api/admin/action/route.ts) | DB stats and admin action runner | [`lib/application/admin/getAdminStats.ts`](../lib/application/admin/getAdminStats.ts), [`lib/application/admin/runAdminAction`](../lib/application/admin/runAdminAction), [`lib/engine/cohort`](../lib/engine/cohort), [`lib/engine/market`](../lib/engine/market) |
| Admin costs page | [`/admin/costs`](../app/admin/costs/page.tsx), [`GET /api/admin/costs`](../app/api/admin/costs/route.ts) | API-cost read model | [`features/admin/costs`](../features/admin/costs), [`lib/application/admin/getAdminCosts.ts`](../lib/application/admin/getAdminCosts.ts) |
| Admin logs page | [`/admin/logs`](../app/admin/logs/page.tsx), [`GET /api/admin/logs`](../app/api/admin/logs/route.ts) | system log read model | [`features/admin/logs`](../features/admin/logs), [`lib/application/admin/getAdminLogs.ts`](../lib/application/admin/getAdminLogs.ts) |
| Admin export creation and download | [`POST /api/admin/export`](../app/api/admin/export/route.ts), [`GET /api/admin/export`](../app/api/admin/export/route.ts) | bounded query exports -> ZIP archive | [`lib/application/admin-export`](../lib/application/admin-export), [`lib/application/admin-export/queries.ts`](../lib/application/admin-export/queries.ts), [`lib/application/admin-export/createAdminExportArchive.ts`](../lib/application/admin-export/createAdminExportArchive.ts) |

### Benchmark lineup management

| Use case | Entrypoint | Primary data source | Main downstream modules |
|---|---|---|---|
| View benchmark family/release/config overview | [`/admin/benchmark`](../app/admin/benchmark/page.tsx), [`GET /api/admin/benchmark`](../app/api/admin/benchmark/route.ts) | benchmark read model | [`features/admin/benchmark`](../features/admin/benchmark), [`lib/application/admin-benchmark/getAdminBenchmarkOverview.ts`](../lib/application/admin-benchmark/getAdminBenchmarkOverview.ts) |
| Register a new model release | [`POST /api/admin/benchmark/releases`](../app/api/admin/benchmark/releases/route.ts) | release write path | [`lib/application/admin-benchmark/createAdminModelRelease.ts`](../lib/application/admin-benchmark/createAdminModelRelease.ts), [`lib/db/queries/model-releases.ts`](../lib/db/queries/model-releases.ts) |
| Create a benchmark config | [`POST /api/admin/benchmark/configs`](../app/api/admin/benchmark/configs/route.ts) | config write path | [`lib/application/admin-benchmark/createAdminBenchmarkConfig.ts`](../lib/application/admin-benchmark/createAdminBenchmarkConfig.ts), [`lib/db/queries/benchmark-configs.ts`](../lib/db/queries/benchmark-configs.ts) |
| Promote default lineup for future cohorts | [`POST /api/admin/benchmark/default`](../app/api/admin/benchmark/default/route.ts) | config promotion | [`lib/application/admin-benchmark/promoteAdminBenchmarkConfig.ts`](../lib/application/admin-benchmark/promoteAdminBenchmarkConfig.ts) |
| Preview or apply active-cohort rollover | [`POST /api/admin/benchmark/rollover`](../app/api/admin/benchmark/rollover/route.ts) | active cohort / agent rewrite | [`lib/application/admin-benchmark/getAdminBenchmarkRolloverPreview.ts`](../lib/application/admin-benchmark/getAdminBenchmarkRolloverPreview.ts), [`lib/db/transactions.ts`](../lib/db/transactions.ts) |

### Cron-driven maintenance

| Use case | Entrypoint | Primary data source | Main downstream modules |
|---|---|---|---|
| Sync Polymarket markets | [`POST /api/cron/sync-markets`](../app/api/cron/sync-markets/route.ts) | Polymarket fetch + market upsert | [`lib/application/cron/syncMarkets.ts`](../lib/application/cron/syncMarkets.ts), [`lib/engine/market/syncMarkets.ts`](../lib/engine/market/syncMarkets.ts), [`lib/polymarket`](../lib/polymarket) |
| Start cohort | [`POST /api/cron/start-cohort`](../app/api/cron/start-cohort/route.ts) | benchmark config + cohort/agent creation | [`lib/application/cron/startCohort.ts`](../lib/application/cron/startCohort.ts), [`lib/engine/cohort/start.ts`](../lib/engine/cohort/start.ts), [`lib/db/queries/cohorts.ts`](../lib/db/queries/cohorts.ts) |
| Run weekly decisions | [`POST /api/cron/run-decisions`](../app/api/cron/run-decisions/route.ts) | active cohorts + top markets + OpenRouter | [`lib/application/cron/runDecisions.ts`](../lib/application/cron/runDecisions.ts), [`lib/engine/decision`](../lib/engine/decision), [`lib/openrouter`](../lib/openrouter) |
| Check resolutions | [`POST /api/cron/check-resolutions`](../app/api/cron/check-resolutions/route.ts) | locally closed markets + Polymarket resolution status | [`lib/application/cron/checkResolutions.ts`](../lib/application/cron/checkResolutions.ts), [`lib/engine/resolution`](../lib/engine/resolution) |
| Take portfolio snapshots | [`POST /api/cron/take-snapshots`](../app/api/cron/take-snapshots/route.ts) | active cohorts + positions + pricing fallback | [`lib/application/cron/takeSnapshots.ts`](../lib/application/cron/takeSnapshots.ts), [`lib/application/cron/snapshotPricing.ts`](../lib/application/cron/snapshotPricing.ts), [`lib/scoring/pnl`](../lib/scoring/pnl) |
| Database backup | [`POST /api/cron/backup`](../app/api/cron/backup/route.ts) | SQLite backup path | [`lib/application/cron/backup.ts`](../lib/application/cron/backup.ts), [`lib/db/backup.ts`](../lib/db/backup.ts) |

## Subsystem Map

### Route and UI layer

- `app/*` page files are thin route wrappers. Public list pages usually return feature clients directly. Dynamic detail pages server-prefetch read models and call `notFound()` on misses.
- `features/*` contains page-level client shells, local API helpers, and request-state logic.
- `components/*` contains reusable charts, navigation, decision feed, and shared UI sections.
- The public shell is anchored by [`app/layout.tsx`](../app/layout.tsx), [`components/Navigation.tsx`](../components/Navigation.tsx), and [`components/AppShellBoundary.tsx`](../components/AppShellBoundary.tsx).

### Application layer

- `lib/application/*` is the main framework-agnostic orchestration layer for pages, APIs, admin flows, cron jobs, and exports.
- Read-model entrypoints are intentionally stable thin barrels:
  - [`lib/application/markets/index.ts`](../lib/application/markets/index.ts)
  - [`lib/application/models/index.ts`](../lib/application/models/index.ts)
  - [`lib/application/cohorts.ts`](../lib/application/cohorts.ts)
  - [`lib/application/cron.ts`](../lib/application/cron.ts)
- Admin control-plane logic is split into:
  - stats, logs, costs, action runner under [`lib/application/admin`](../lib/application/admin)
  - benchmark family/release/config management under [`lib/application/admin-benchmark`](../lib/application/admin-benchmark)
  - export generation under [`lib/application/admin-export`](../lib/application/admin-export)

### Engine layer

- `lib/engine/cohort/*`: cohort scheduling, startup, completion checks, week-normalization behavior.
- `lib/engine/market/*`: top-market ingestion plus status refresh for already-relevant markets.
- `lib/engine/decision/*`: cohort-wide sequential decision execution plus the per-agent decision state machine.
- `lib/engine/execution/*`: simulated BET and SELL accounting commits.
- `lib/engine/resolution/*`: market-resolution checks, position settlement, cancellation handling, and historical Brier diagnostic generation.

### Persistence layer

- `lib/db/schema/tables/*`, [`lib/db/schema/indexes.ts`](../lib/db/schema/indexes.ts), and [`lib/db/migrations`](../lib/db/migrations) define the physical schema.
- [`lib/db/initialize.ts`](../lib/db/initialize.ts) applies tables, seeds, migrations, indexes, and views.
- [`lib/db/queries`](../lib/db/queries) is the main query facade used throughout the app.
- [`lib/db/transactions.ts`](../lib/db/transactions.ts) provides `withTransaction()` and `withImmediateTransaction()`; the latter is used for lock-first concurrency-sensitive flows.

### Integrations and shared runtime helpers

- `lib/openrouter/*`: prompt construction, transport, retry policy, pricing, and response parsing.
- `lib/polymarket/*`: market fetch, normalization, and resolution helpers.
- `lib/scoring/*`: PnL calculations, historical Brier diagnostics, chart helpers.
- `lib/auth/*`, `lib/api/*`, and `middleware.ts`: admin session signing, cron auth, route auth wrappers, and rate limiting.

## Critical Flows

### 1. Market sync

Flow:

1. [`POST /api/cron/sync-markets`](../app/api/cron/sync-markets/route.ts)
2. [`lib/application/cron/syncMarkets.ts`](../lib/application/cron/syncMarkets.ts)
3. [`lib/engine/market/syncMarkets.ts`](../lib/engine/market/syncMarkets.ts)
4. [`lib/engine/market/upsertTopMarkets.ts`](../lib/engine/market/upsertTopMarkets.ts) fetches and upserts top-volume markets.
5. [`lib/engine/market/refreshStatuses.ts`](../lib/engine/market/refreshStatuses.ts) revisits locally relevant markets so open-position status changes are not gated by the top-volume window.
6. Writes land through DB query modules and are logged to `system_logs`.

Key property:

- The market universe used for decision runs is prompt-bounded by `TOP_MARKETS_COUNT`, but status refresh is broader than the top-N window for already-relevant markets.

### 2. Cohort bootstrap

Flow:

1. [`POST /api/cron/start-cohort`](../app/api/cron/start-cohort/route.ts) or `run-decisions` bootstrap path.
2. [`lib/application/cron/startCohort.ts`](../lib/application/cron/startCohort.ts) or [`lib/application/cron/runDecisions.ts`](../lib/application/cron/runDecisions.ts).
3. [`lib/engine/cohort/maybeStart.ts`](../lib/engine/cohort/maybeStart.ts) decides whether the current UTC week needs a cohort.
4. [`lib/engine/cohort/start.ts`](../lib/engine/cohort/start.ts) opens an immediate transaction, reads the promoted default benchmark config, creates the cohort row, and creates agents if they do not already exist.
5. Agent creation uses frozen family / release / benchmark-config-slot assignments.

Key property:

- Startup is safe to rerun for the same normalized week because uniqueness is enforced both by the cohort week key and by frozen agent-slot identity.

### 3. Active-lineup refresh before decisions

Flow:

1. [`lib/application/cron/runDecisions.ts`](../lib/application/cron/runDecisions.ts) calls an internal `refreshActiveCohortsToDefaultBenchmarkConfig()`.
2. The function reads the promoted default config and all of its config-model assignments.
3. Inside `withImmediateTransaction()`, it updates each active cohort’s `benchmark_config_id` and rewrites each agent’s `release_id` and `benchmark_config_model_id` to the config target for that family.

Key property:

- Historical records stay stable because decisions, trades, and Brier diagnostic rows snapshot lineage at write time even if an active cohort later rolls forward to a new release.

### 4. Decision pipeline

Flow:

1. [`POST /api/cron/run-decisions`](../app/api/cron/run-decisions/route.ts)
2. [`lib/application/cron/runDecisions.ts`](../lib/application/cron/runDecisions.ts)
3. [`lib/engine/decision/runAllDecisions.ts`](../lib/engine/decision/runAllDecisions.ts) iterates active cohorts.
4. [`lib/engine/decision/runCohortDecisions.ts`](../lib/engine/decision/runCohortDecisions.ts) loads agents and top markets, then processes agents sequentially.
5. [`lib/engine/decision/processAgentDecision/execute.ts`](../lib/engine/decision/processAgentDecision/execute.ts) performs the per-agent state machine:
   - claim canonical decision row through [`lib/engine/decision/processAgentDecision/claim.ts`](../lib/engine/decision/processAgentDecision/claim.ts)
   - claim implementation in [`lib/db/queries/decisions/claim.ts`](../lib/db/queries/decisions/claim.ts)
   - build prompt via [`lib/engine/decision/buildDecisionUserPrompt.ts`](../lib/engine/decision/buildDecisionUserPrompt.ts)
   - system prompt from [`lib/openrouter/prompts/systemPrompt.ts`](../lib/openrouter/prompts/systemPrompt.ts)
   - call OpenRouter and retry malformed responses through [`lib/engine/decision/processAgentDecision/llm.ts`](../lib/engine/decision/processAgentDecision/llm.ts)
   - parse JSON via [`lib/openrouter/parser/parseDecision.ts`](../lib/openrouter/parser/parseDecision.ts)
   - finalize decision row and API cost via [`lib/engine/decision/processAgentDecision/finalize.ts`](../lib/engine/decision/processAgentDecision/finalize.ts)
   - execute BET or SELL instructions through [`lib/engine/decision/executeDecisionTrades.ts`](../lib/engine/decision/executeDecisionTrades.ts), [`lib/engine/execution/bet.ts`](../lib/engine/execution/bet.ts), and [`lib/engine/execution/sell.ts`](../lib/engine/execution/sell.ts)

Key properties:

- Decision rows are claimed before model I/O.
- Invalid model output falls back to a synthetic `HOLD` after the configured parse retry count.
- Execution failure after a valid decision is tracked separately from parse or transport failure.
- Decisions are intentionally processed sequentially per cohort, with a sleep between agents, to reduce contention and keep runtime behavior predictable.

### 5. Resolution -> settlement -> historical Brier diagnostics

Flow:

1. [`POST /api/cron/check-resolutions`](../app/api/cron/check-resolutions/route.ts)
2. [`lib/application/cron/checkResolutions.ts`](../lib/application/cron/checkResolutions.ts)
3. [`lib/engine/resolution/checkAllResolutions.ts`](../lib/engine/resolution/checkAllResolutions.ts) iterates locally closed markets.
4. [`lib/engine/resolution/checkMarketResolution.ts`](../lib/engine/resolution/checkMarketResolution.ts) fetches upstream market state and determines whether the market is resolved.
5. If resolved, [`lib/engine/resolution/processResolvedMarket.ts`](../lib/engine/resolution/processResolvedMarket.ts) and [`lib/engine/resolution/settlePositionForMarket.ts`](../lib/engine/resolution/settlePositionForMarket.ts) settle each open position.
6. [`lib/engine/resolution/brier.ts`](../lib/engine/resolution/brier.ts) records historical Brier diagnostics from relevant buy trades.
7. The market is only marked locally `resolved` after settlement succeeds.

Key property:

- Partial settlement failure leaves the market `closed`, not `resolved`, so the next pass can safely retry remaining work.

### 6. Snapshot generation

Flow:

1. [`POST /api/cron/take-snapshots`](../app/api/cron/take-snapshots/route.ts)
2. [`lib/application/cron/takeSnapshots.ts`](../lib/application/cron/takeSnapshots.ts)
3. Load all active cohorts and agents.
4. For each agent, read all open positions, derive snapshot pricing through [`lib/application/cron/snapshotPricing.ts`](../lib/application/cron/snapshotPricing.ts), update mark-to-market fields on positions, and create a portfolio snapshot row.
5. Refresh persisted performance cache through [`lib/application/performance.ts`](../lib/application/performance.ts).

Key property:

- Snapshots are timestamped, not day-bucketed, which is what enables the `10M`, `1H`, and other intraday chart ranges.

### 7. Admin benchmark release / config / rollover flow

Flow:

1. [`features/admin/benchmark/api.ts`](../features/admin/benchmark/api.ts) drives the control plane from the admin UI.
2. Overview: [`GET /api/admin/benchmark`](../app/api/admin/benchmark/route.ts) -> [`lib/application/admin-benchmark/getAdminBenchmarkOverview.ts`](../lib/application/admin-benchmark/getAdminBenchmarkOverview.ts).
3. Release creation: [`POST /api/admin/benchmark/releases`](../app/api/admin/benchmark/releases/route.ts) -> [`lib/application/admin-benchmark/createAdminModelRelease.ts`](../lib/application/admin-benchmark/createAdminModelRelease.ts).
4. Config creation: [`POST /api/admin/benchmark/configs`](../app/api/admin/benchmark/configs/route.ts) -> [`lib/application/admin-benchmark/createAdminBenchmarkConfig.ts`](../lib/application/admin-benchmark/createAdminBenchmarkConfig.ts).
5. Promotion: [`POST /api/admin/benchmark/default`](../app/api/admin/benchmark/default/route.ts) -> [`lib/application/admin-benchmark/promoteAdminBenchmarkConfig.ts`](../lib/application/admin-benchmark/promoteAdminBenchmarkConfig.ts).
6. Preview/apply active rollover: [`POST /api/admin/benchmark/rollover`](../app/api/admin/benchmark/rollover/route.ts) -> [`lib/application/admin-benchmark/getAdminBenchmarkRolloverPreview.ts`](../lib/application/admin-benchmark/getAdminBenchmarkRolloverPreview.ts).

Key properties:

- A promoted config must cover every active family.
- A new release must belong to the requested family and cannot duplicate family-local slug or OpenRouter ID.
- Rollover preview computes affected cohorts, agents, and release changes before any mutation.

## State, Schema, And Invariants

### Entity map

High-level entity graph:

```text
model_families -> model_releases
model_families -> benchmark_config_models <- benchmark_configs
benchmark_configs -> cohorts -> agents -> decisions -> trades -> brier_scores
agents -> positions -> markets
agents -> portfolio_snapshots
agents -> api_costs
cohorts -> system_logs (logical operational lineage)
```

Practical interpretation:

- `model_families`: stable public competitor slots.
- `model_releases`: exact deployed model targets.
- `benchmark_configs` and `benchmark_config_models`: frozen lineups for future or active cohorts.
- `cohorts`: one weekly competition instance.
- `agents`: cohort-bound frozen family / release / config-slot participants.
- `decisions`: one canonical weekly decision record per agent / cohort / week.
- `trades`: append-only execution records tied back to decisions.
- `positions`: current holdings per market / side.
- `portfolio_snapshots`: timestamped equity state, with legacy diagnostic Brier fields where available.
- `brier_scores`: post-resolution historical calibration diagnostics derived from buy trades.
- `api_costs`: token and cost attribution, linked to agent / family / release / decision lineage.
- `system_logs`: operational events and failures.

Primary schema sources:

- [`lib/db/schema/tables/benchmark.ts`](../lib/db/schema/tables/benchmark.ts)
- [`lib/db/schema/tables/decisions.ts`](../lib/db/schema/tables/decisions.ts)
- [`lib/db/schema/tables/markets.ts`](../lib/db/schema/tables/markets.ts)
- [`lib/db/schema/tables/analytics.ts`](../lib/db/schema/tables/analytics.ts)
- [`lib/db/schema/indexes.ts`](../lib/db/schema/indexes.ts)
- [`lib/db/migrations`](../lib/db/migrations)

### Invariants and where they are enforced

| Invariant | Primary enforcement |
|---|---|
| One cohort per normalized UTC week | schema uniqueness on `cohorts.started_at`, cohort query logic, immediate-transaction startup path |
| One frozen agent slot per cohort benchmark slot | schema uniqueness on `agents`, `createAgentsForCohort`, lineage migrations and write guards |
| One decision per agent / cohort / week | unique decision index when legacy data permits, claim-based decision acquisition in [`lib/db/queries/decisions/claim.ts`](../lib/db/queries/decisions/claim.ts) |
| Retry-safe decision processing | in-progress placeholder row with stale timeout, skip logic for already-finalized rows, no-trade retry path |
| Frozen historical lineage | decisions, trades, and Brier diagnostic rows snapshot family / release / config lineage at write time; active cohort refresh only mutates active agents |
| Snapshot idempotency per timestamp | snapshot uniqueness at query/schema level plus deterministic timestamped creation path |
| Brier diagnostic uniqueness | migration and write rules around trade lineage and Brier creation |
| Settlement-before-resolution | resolution engine only flips market state after settlement succeeds |

### Concurrency and failure handling

- Immediate transactions are reserved for lock-sensitive paths: cohort start, decision claim, active-lineup refresh, and rollover application.
- Decision claims use a placeholder `ERROR` row with a special in-progress error marker to prevent duplicate model calls on concurrent runs.
- Stale in-progress decisions are reclaimable after `LLM_TIMEOUT_MS * 2`.
- Sequential cohort processing and per-agent sleeps reduce external provider contention and keep error handling local to one agent at a time.
- Market-resolution processing aggregates per-market errors rather than aborting the entire scan.

## Auth, Redaction, And Safety Boundaries

- Cron routes require `Authorization: Bearer <CRON_SECRET>` through [`lib/api/cron-auth.ts`](../lib/api/cron-auth.ts).
- Admin routes require a signed `forecaster_admin` cookie through [`lib/auth/adminSession.ts`](../lib/auth/adminSession.ts) and [`lib/api/admin-route.ts`](../lib/api/admin-route.ts).
- Rate limiting is centralized in [`middleware.ts`](../middleware.ts) and [`lib/middleware/policies.ts`](../lib/middleware/policies.ts):
  - login: `5` requests per minute
  - cron: `10` POSTs per minute
  - admin: `30` requests per minute
- Public errors are redacted with [`lib/utils/security.ts`](../lib/utils/security.ts); health output hides exact missing-secret names and raw DB exceptions.
- Admin export is intentionally bounded and filename-sanitized; archive generation runs without shell interpolation through [`lib/application/admin-export`](../lib/application/admin-export).

## Coverage And Drift Review

### What Vitest primarily protects

- Route wiring and server wrapper behavior:
  - [`tests/page-wiring.test.ts`](../tests/page-wiring.test.ts)
  - detail/public route tests such as [`tests/model-route.test.ts`](../tests/model-route.test.ts), [`tests/cohort-routes.test.ts`](../tests/cohort-routes.test.ts), [`tests/market-detail-route.test.ts`](../tests/market-detail-route.test.ts), [`tests/public-data-routes.test.ts`](../tests/public-data-routes.test.ts)
- Engine behavior:
  - decisions, execution, resolution, market sync, cohort lifecycle
  - examples: [`tests/decision.test.ts`](../tests/decision.test.ts), [`tests/execution.test.ts`](../tests/execution.test.ts), [`tests/resolution.test.ts`](../tests/resolution.test.ts), [`tests/market-engine.test.ts`](../tests/market-engine.test.ts), [`tests/cohort.test.ts`](../tests/cohort.test.ts)
- Schema, lineage, and idempotency:
  - [`tests/schema-seed-and-idempotency.test.ts`](../tests/schema-seed-and-idempotency.test.ts)
  - [`tests/rollover-and-lineage-application.test.ts`](../tests/rollover-and-lineage-application.test.ts)
  - [`tests/model-identity-query-modules.test.ts`](../tests/model-identity-query-modules.test.ts)
- Admin safety and auth:
  - [`tests/admin-security-routes.test.ts`](../tests/admin-security-routes.test.ts)
  - [`tests/admin-session-auth.test.ts`](../tests/admin-session-auth.test.ts)
  - [`tests/middleware.test.ts`](../tests/middleware.test.ts)

### What Playwright primarily protects

- Public route rendering and navigation:
  - [`playwright/smoke.spec.ts`](../playwright/smoke.spec.ts)
  - [`playwright/public-pages.spec.ts`](../playwright/public-pages.spec.ts)
  - [`playwright/navigation-and-filters.spec.ts`](../playwright/navigation-and-filters.spec.ts)
- Drilldowns and interactive UI:
  - [`playwright/drilldowns.spec.ts`](../playwright/drilldowns.spec.ts)
  - [`playwright/decision-detail.spec.ts`](../playwright/decision-detail.spec.ts)
  - [`playwright/interactions.spec.ts`](../playwright/interactions.spec.ts)
- Admin flows and benchmark control:
  - [`playwright/admin.spec.ts`](../playwright/admin.spec.ts)
  - [`playwright/admin-session.spec.ts`](../playwright/admin-session.spec.ts)
  - [`playwright/admin-benchmark.spec.ts`](../playwright/admin-benchmark.spec.ts)
- Empty-state behavior:
  - [`playwright/empty-state.spec.ts`](../playwright/empty-state.spec.ts)

### Confirmed drift and weakly enforced areas

- [`docs/API_REFERENCE.md`](./API_REFERENCE.md) does not currently list [`POST /api/admin/benchmark/rollover`](../app/api/admin/benchmark/rollover/route.ts), even though the route exists and the admin UI uses it.
- [`tests/public-data-routes.test.ts`](../tests/public-data-routes.test.ts) includes a naming mismatch: the test title says `no-store`, but the leaderboard route actually asserts cacheable `public, max-age=15, stale-while-revalidate=45`.
- Static informational pages are mostly protected by browser navigation smoke coverage rather than route-specific server-wrapper tests.
- Most UI regression protection is at the Playwright level; Vitest intentionally focuses more on route contracts, application helpers, engine logic, and persistence than on visual component behavior.

## Practical Reading Order

If you need to understand the system fast, read in this order:

1. [`README.md`](../README.md)
2. [`ARCHITECTURE.md`](../ARCHITECTURE.md)
3. [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
4. This file
5. [`docs/DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md)
6. [`docs/OPERATIONS.md`](./OPERATIONS.md)
7. [`docs/API_REFERENCE.md`](./API_REFERENCE.md)
8. The critical runtime files referenced in the flow sections above
