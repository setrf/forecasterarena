# Database Schema Reference

Last updated: 2026-03-07

- Database engine: SQLite
- Driver: `better-sqlite3`
- Default path: `data/forecaster.db`

This document describes the schema that the application currently initializes through
`lib/db/schema/tables`, `lib/db/migrations`, and `lib/db/views`. It is intended to be the implementation-aligned reference
for analysts, operators, and future migration work.

---

## 1. Design Principles

The schema is optimized for:

1. reproducibility
2. auditability
3. simple single-node deployment
4. safe retry behavior for cron-driven workflows

The most important implications are:

- prompts and raw model responses are stored
- market/trade/decision history is append-oriented
- weekly cohort and decision uniqueness are enforced at the database layer
- portfolio history is timestamped, not merely day-bucketed

---

## 2. Entity Map

```text
methodology_versions
        ^
        |
      cohorts ----< agents ----< decisions
         |            |             |
         |            |             v
         |            |           trades ----< brier_scores
         |            |
         |            +----< positions >---- markets
         |            |
         |            +----< portfolio_snapshots
         |
         +----------------------------------< system_logs (logical ops only)

models ----< agents (legacy compatibility key only)
model_families ----< model_releases
benchmark_configs ----< benchmark_config_models
benchmark_configs ----< cohorts
model_families ----< benchmark_config_models
model_releases ----< benchmark_config_models
model_families ----< agents
model_releases ----< agents
benchmark_config_models ----< agents
agents ----< api_costs
decisions ----< api_costs
```

Legend:

- `A ----< B` means one `A` row relates to many `B` rows
- some relationships are logical rather than enforced through direct foreign
  keys from both directions

---

## 3. Table Reference

### 3.1 `methodology_versions`

Tracks benchmark methodology versions for reproducibility.

| Column | Type | Notes |
|--------|------|-------|
| `version` | `TEXT` | Primary key |
| `title` | `TEXT` | Not null |
| `description` | `TEXT` | Not null |
| `changes_summary` | `TEXT` | Nullable |
| `effective_from_cohort` | `INTEGER` | Nullable |
| `document_hash` | `TEXT` | Nullable |
| `created_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Operational notes:

- The app seeds methodology metadata on startup.
- `cohorts.methodology_version` references this table.

---

### 3.2 `cohorts`

Represents one weekly benchmark competition instance.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key |
| `cohort_number` | `INTEGER` | Not null, unique |
| `started_at` | `TEXT` | Not null; normalized weekly UTC start |
| `status` | `TEXT` | Not null, default `active` |
| `completed_at` | `TEXT` | Nullable |
| `methodology_version` | `TEXT` | Not null, default `v1` |
| `benchmark_config_id` | `TEXT` | Not null frozen lineup/config reference |
| `initial_balance` | `REAL` | Not null, default `10000.00` |
| `is_archived` | `INTEGER` | Not null, default `0`; archived cohorts are excluded from current scoring/snapshots |
| `archived_at` | `TEXT` | Nullable archive timestamp |
| `archive_reason` | `TEXT` | Nullable human-readable archive reason |
| `created_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Foreign keys:

- `methodology_version -> methodology_versions(version)`
- `benchmark_config_id -> benchmark_configs(id)`

Uniqueness:

- `cohort_number` is unique
- `started_at` is also uniquely indexed so only one cohort can exist for a
  given normalized week start

Why `started_at` uniqueness matters:

- the application creates cohorts by normalized Sunday `00:00 UTC`
- duplicate week creation would corrupt aggregated cohort comparisons

---

### 3.3 `models`

Legacy compatibility table for historical public model IDs.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key; stable internal identifier |
| `openrouter_id` | `TEXT` | Not null, unique |
| `display_name` | `TEXT` | Not null |
| `provider` | `TEXT` | Not null |
| `color` | `TEXT` | Nullable |
| `is_active` | `INTEGER` | Default `1` |
| `added_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Current seeded legacy compatibility IDs in code:

| `id` | `display_name` |
|------|----------------|
| `gpt-5.1` | `GPT-5.5` |
| `gemini-2.5-flash` | `Gemini 3.1 Pro Preview` |
| `grok-4` | `Grok 4.3` |
| `claude-opus-4.5` | `Claude Opus 4.7` |
| `deepseek-v3.1` | `DeepSeek V4 Pro` |
| `kimi-k2` | `Kimi K2.6` |
| `qwen-3-next` | `Qwen 3.6 Max Preview` |

Important note:

- the stable internal `id` is not guaranteed to match the newest display name
- historical benchmark identity should not be read from this table directly; use family/release/config lineage instead

---

### 3.3a Lineage Model

The benchmark now separates model identity into four layers:

- `model_families`: the stable competitor slot shown publicly
- `model_releases`: the exact deployed model used for execution
- `benchmark_configs`: the default lineup definition promoted by operators
- `agents`: the cohort-bound frozen assignment of family, release, and config slot

This is what prevents a future release rotation from rewriting active or historical cohorts.

---

### 3.3b `model_families`

Stable benchmark families such as `openai-gpt` or `google-gemini`.

Important columns:

- `id`
- `slug`
- `legacy_model_id`
- `provider`
- `family_name`
- `public_display_name`
- `short_display_name`
- `color`
- `status`
- `sort_order`
- `created_at`
- `retired_at`

Notes:

- `legacy_model_id` preserves compatibility with older routes and exports
- `status` controls whether a family should appear in future default lineups

---

### 3.3c `model_releases`

Immutable execution targets for one family.

Important columns:

- `id`
- `family_id`
- `release_name`
- `release_slug`
- `openrouter_id`
- `provider`
- `metadata_json`
- `release_status`
- `created_at`
- `retired_at`
- `first_used_cohort_number`
- `last_used_cohort_number`

Notes:

- one family can have many releases over time
- `metadata_json` may store operator notes and default pricing hints

---

### 3.3d `benchmark_configs`

Frozen lineup manifests used when starting new cohorts and, when applied, for active cohort rollovers.

Important columns:

- `id`
- `version_name`
- `methodology_version`
- `notes`
- `created_by`
- `is_default_for_future_cohorts`
- `created_at`

Operational note:

- current and future cohorts may point at the promoted default config
- legacy cohorts backfilled during migration can receive cohort-specific `benchmark-config-backfill-<cohort_id>` configs so historical assignments are frozen without rewriting the shared future default
- active cohorts may also be rolled to the promoted default config through explicit admin rollover or the Sunday decision-refresh path
- decision eligibility is derived at runtime from the latest cohort-number window; no schema column stores whether an active cohort is decisioning or tracking-only

---

### 3.3e `benchmark_config_models`

Frozen family/release assignments inside one benchmark config. Decisions, trades, and brier scores also snapshot release lineage at write time so historical records remain stable after future family rollovers.

Important columns:

- `id`
- `benchmark_config_id`
- `family_id`
- `release_id`
- `slot_order`
- `family_display_name_snapshot`
- `short_display_name_snapshot`
- `release_display_name_snapshot`
- `provider_snapshot`
- `color_snapshot`
- `openrouter_id_snapshot`
- `input_price_per_million_snapshot`
- `output_price_per_million_snapshot`
- `created_at`

Notes:

- this is the authoritative pricing snapshot for cost reproducibility
- future vendor pricing changes do not rewrite old cohort costs

---

### 3.4 `agents`

Represents one frozen benchmark assignment inside one cohort.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key |
| `cohort_id` | `TEXT` | Not null |
| `model_id` | `TEXT` | Not null legacy compatibility key |
| `family_id` | `TEXT` | Not null stable benchmark family |
| `release_id` | `TEXT` | Not null exact model release |
| `benchmark_config_model_id` | `TEXT` | Not null frozen config slot |
| `cash_balance` | `REAL` | Not null, default `10000.00` |
| `total_invested` | `REAL` | Not null, default `0.00` |
| `status` | `TEXT` | Not null, default `active` |
| `created_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Foreign keys:

- `cohort_id -> cohorts(id)`
- `model_id -> models(id)`
- `family_id -> model_families(id)`
- `release_id -> model_releases(id)`
- `benchmark_config_model_id -> benchmark_config_models(id)`

Uniqueness:

- `UNIQUE(cohort_id, benchmark_config_model_id)`

Interpretation:

- the physical uniqueness guard is the frozen benchmark slot key
- `model_id` remains only as a legacy compatibility foreign key into `models`
- the historical truth for execution and display is carried by `family_id`, `release_id`, and `benchmark_config_model_id`
- the application centralizes joined historical reads through the `agent_benchmark_identity_v` view

---

### 3.5 `markets`

Stores local Polymarket market state.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key |
| `polymarket_id` | `TEXT` | Not null, unique |
| `slug` | `TEXT` | Nullable |
| `event_slug` | `TEXT` | Nullable |
| `question` | `TEXT` | Not null |
| `description` | `TEXT` | Nullable |
| `category` | `TEXT` | Nullable |
| `market_type` | `TEXT` | Not null, default `binary` |
| `outcomes` | `TEXT` | Nullable JSON-ish payload |
| `close_date` | `TEXT` | Not null |
| `status` | `TEXT` | Not null, default `active` |
| `current_price` | `REAL` | Nullable YES price for binary markets |
| `current_prices` | `TEXT` | Nullable multi-outcome prices payload |
| `clob_token_ids` | `TEXT` | Nullable JSON token ids aligned with YES/NO or outcomes |
| `volume` | `REAL` | Nullable |
| `liquidity` | `REAL` | Nullable |
| `resolution_outcome` | `TEXT` | Nullable |
| `resolved_at` | `TEXT` | Nullable |
| `first_seen_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |
| `last_updated_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Statuses used in practice:

- `active`
- `closed`
- `resolved`
- `cancelled` may appear conceptually, but current resolution handling writes
  `status = 'resolved'` with `resolution_outcome = 'CANCELLED'`

Operational note:

- local status is not flipped to `resolved` until settlement succeeds

---

### 3.6 `positions`

Tracks open or historical holdings by agent, market, and side.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key |
| `agent_id` | `TEXT` | Not null |
| `market_id` | `TEXT` | Not null |
| `side` | `TEXT` | Not null |
| `shares` | `REAL` | Not null |
| `avg_entry_price` | `REAL` | Not null |
| `total_cost` | `REAL` | Not null |
| `current_value` | `REAL` | Nullable |
| `unrealized_pnl` | `REAL` | Nullable |
| `status` | `TEXT` | Not null, default `open` |
| `opened_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |
| `closed_at` | `TEXT` | Nullable |

Foreign keys:

- `agent_id -> agents(id)`
- `market_id -> markets(id)`

Uniqueness:

- `UNIQUE(agent_id, market_id, side)`

Statuses:

- `open`
- `closed`
- `settled`

Interpretation:

- `closed` means the position was exited through sells
- `settled` means the market outcome finalized the position

---

### 3.7 `decisions`

Stores one weekly decision record per agent/cohort/week.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key |
| `agent_id` | `TEXT` | Not null |
| `cohort_id` | `TEXT` | Not null |
| `decision_week` | `INTEGER` | Not null |
| `decision_timestamp` | `TEXT` | Not null |
| `prompt_system` | `TEXT` | Not null |
| `prompt_user` | `TEXT` | Not null |
| `raw_response` | `TEXT` | Nullable |
| `parsed_response` | `TEXT` | Nullable |
| `retry_count` | `INTEGER` | Default `0` |
| `action` | `TEXT` | Not null |
| `reasoning` | `TEXT` | Nullable |
| `tokens_input` | `INTEGER` | Nullable |
| `tokens_output` | `INTEGER` | Nullable |
| `api_cost_usd` | `REAL` | Nullable |
| `response_time_ms` | `INTEGER` | Nullable |
| `error_message` | `TEXT` | Nullable |
| `created_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Foreign keys:

- `agent_id -> agents(id)`
- `cohort_id -> cohorts(id)`

Important uniqueness:

- unique index on `(agent_id, cohort_id, decision_week)`

Why this matters:

- overlapping cron runs must not create duplicate weekly decisions for one agent

Lifecycle note:

- the engine may first write an in-progress placeholder row
- later it finalizes that same row with the actual prompts, response, action,
  timings, and errors

This means:

- `action = 'ERROR'` does not always mean an immutable terminal state
- some `ERROR` rows can represent claim/retry bookkeeping before finalization

---

### 3.8 `trades`

Stores all simulated buys and sells.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key |
| `agent_id` | `TEXT` | Not null |
| `market_id` | `TEXT` | Not null |
| `position_id` | `TEXT` | Nullable |
| `decision_id` | `TEXT` | Nullable |
| `trade_type` | `TEXT` | Not null |
| `side` | `TEXT` | Not null |
| `shares` | `REAL` | Not null |
| `price` | `REAL` | Not null |
| `total_amount` | `REAL` | Not null |
| `implied_confidence` | `REAL` | Nullable |
| `cost_basis` | `REAL` | Nullable |
| `realized_pnl` | `REAL` | Nullable |
| `executed_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Foreign keys:

- `agent_id -> agents(id)`
- `market_id -> markets(id)`
- `position_id -> positions(id)`
- `decision_id -> decisions(id)`

Interpretation:

- `BUY` trades are the source of Brier-score confidence data
- `SELL` trades can carry cost basis and realized P/L

---

### 3.9 `portfolio_snapshots`

Timestamped portfolio history for charts and operations.
Open-position values are derived from validated CLOB prices when available;
Gamma catalog prices remain stored on `markets` for display and comparison.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key |
| `agent_id` | `TEXT` | Not null |
| `snapshot_timestamp` | `TEXT` | Not null |
| `cash_balance` | `REAL` | Not null |
| `positions_value` | `REAL` | Not null |
| `total_value` | `REAL` | Not null |
| `total_pnl` | `REAL` | Not null |
| `total_pnl_percent` | `REAL` | Not null |
| `brier_score` | `REAL` | Nullable |
| `num_resolved_bets` | `INTEGER` | Default `0` |
| `created_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Foreign keys:

- `agent_id -> agents(id)`

Uniqueness:

- `UNIQUE(agent_id, snapshot_timestamp)`

Important correction:

- the schema is timestamp-based
- documentation that refers to `snapshot_date` is outdated

This table is what enables intraday and recent chart ranges such as `1D` and `1W`.

---

### 3.10 `market_price_snapshots`

Per-market price provenance captured during portfolio snapshot runs.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key |
| `market_id` | `TEXT` | Not null |
| `snapshot_timestamp` | `TEXT` | Not null |
| `source` | `TEXT` | `clob` or `fallback` |
| `accepted_price` | `REAL` | Nullable accepted YES price for binary markets |
| `accepted_prices` | `TEXT` | Nullable accepted multi-outcome price JSON |
| `gamma_price` | `REAL` | Nullable Gamma comparison YES price |
| `gamma_prices` | `TEXT` | Nullable Gamma comparison multi-outcome prices |
| `clob_token_ids` | `TEXT` | Token ids used or discovered for valuation |
| `validation_status` | `TEXT` | Accepted, disagreement, or fallback status |
| `anomaly_reason` | `TEXT` | Nullable reason when fallback/disagreement occurred |
| `created_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Uniqueness:

- `UNIQUE(market_id, snapshot_timestamp)`

---

### 3.11 `brier_scores`

One scoring row per resolved buy trade.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key |
| `agent_id` | `TEXT` | Not null |
| `trade_id` | `TEXT` | Not null |
| `market_id` | `TEXT` | Not null |
| `forecast_probability` | `REAL` | Not null |
| `actual_outcome` | `REAL` | Not null |
| `brier_score` | `REAL` | Not null |
| `calculated_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Foreign keys:

- `agent_id -> agents(id)`
- `trade_id -> trades(id)`
- `market_id -> markets(id)`

Behavior note:

- the query layer deduplicates by `trade_id` before inserting

---

### 3.12 `api_costs`

Optional cost-tracking table for model usage with frozen lineage.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key |
| `model_id` | `TEXT` | Not null legacy compatibility key |
| `agent_id` | `TEXT` | Nullable frozen agent assignment |
| `family_id` | `TEXT` | Nullable stable benchmark family |
| `release_id` | `TEXT` | Nullable exact model release |
| `benchmark_config_model_id` | `TEXT` | Nullable frozen config slot |
| `decision_id` | `TEXT` | Nullable |
| `tokens_input` | `INTEGER` | Nullable |
| `tokens_output` | `INTEGER` | Nullable |
| `cost_usd` | `REAL` | Nullable |
| `recorded_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Foreign keys:

- `model_id -> models(id)`
- `agent_id -> agents(id)`
- `family_id -> model_families(id)`
- `release_id -> model_releases(id)`
- `benchmark_config_model_id -> benchmark_config_models(id)`
- `decision_id -> decisions(id)`

Note:

- the main decision flow also stores estimated cost directly on `decisions`
- `api_costs` exists so cost lineage can stand on its own even if family labels or release mappings evolve later
- fresh installs enforce non-null cohort/agent lineage in the base schema, and migrated databases install SQLite triggers that reject future writes which try to clear that frozen lineage

---

### 3.13 `system_logs`

Application audit trail and operational log stream.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key |
| `event_type` | `TEXT` | Not null |
| `event_data` | `TEXT` | Nullable JSON payload |
| `severity` | `TEXT` | Default `info` |
| `created_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Used for:

- market sync completion/error logs
- cohort start/completion logs
- decision execution failure reporting
- resolution partial failure reporting
- admin action audit events

---

## 4. Key Indexes

The schema contains many read-performance indexes. The most important semantic
ones are:

### Integrity / uniqueness indexes

- `UNIQUE(cohort_id, benchmark_config_model_id)` on `agents`
- `UNIQUE(agent_id, market_id, side)` on `positions`
- `UNIQUE(agent_id, snapshot_timestamp)` on `portfolio_snapshots`
- unique index on `decisions(agent_id, cohort_id, decision_week)`
- unique index on `cohorts(started_at)`

### Operational query indexes

- `idx_markets_status`
- `idx_markets_volume`
- `idx_trades_decision`
- `idx_decisions_agent_week`
- `idx_snapshots_agent_timestamp`
- `idx_cohorts_archived_status`
- `idx_logs_created`

Why these matter:

- leaderboard and detail pages read recent snapshots and recent decisions often
- cron workflows query closed markets, active cohorts, and per-agent weekly
  decision state repeatedly

---

## 5. Important Query Semantics

### 5.1 Current-week cohort lookup

`getCohortForCurrentWeek()` looks up the cohort whose `started_at` equals the
normalized current UTC week start.

### 5.2 Decision claiming

`claimDecisionForProcessing(...)` serializes the check-then-write path for
weekly decisions using an immediate transaction and the unique decision index.

### 5.3 Resolution retry safety

Markets stay locally `closed` if settlement partially fails, so later resolution
passes can safely retry the same market.

### 5.4 Aggregate performance curves

`/api/performance-data` groups `portfolio_snapshots` by timestamp and averages
portfolio values across cohorts when needed. It also emits `release_changes`
so charts can annotate where family release upgrades occurred.

Global and family-scoped curves exclude archived cohorts. Direct cohort-scoped
requests may include an archived cohort so historical pages remain accessible.

The snapshot cron now also refreshes a persisted `performance_chart_cache`
table for the global time ranges. This lets cold app starts serve the main
chart from SQLite-backed cached JSON instead of recomputing the full recent
series on the first request.

### 5.5 Price provenance and anomaly handling

Portfolio valuation uses CLOB midpoints as the authoritative paper-accounting
price source. Each snapshot run stores Gamma comparison prices, accepted CLOB
prices, token ids, and fallback/disagreement status in `market_price_snapshots`.
When CLOB pricing is missing or invalid, positions keep their prior value and a
system log anomaly is emitted instead of baking a suspect Gamma price into the
portfolio curve.

---

## 6. Practical Analyst Notes

- Use stable model IDs for joins.
- Use display names for presentation.
- Treat `decision_timestamp` as the operational timestamp, not `created_at`.
- Use `snapshot_timestamp` for chart reconstruction.
- When analyzing error rows in `decisions`, inspect `error_message` and the
  presence or absence of related `trades`.

---

## 7. Migration / Compatibility Warnings

If you are applying the current app to an older long-lived database, validate
that there are no pre-existing duplicates that would violate the newer unique
indexes:

```sql
SELECT started_at, COUNT(*)
FROM cohorts
GROUP BY started_at
HAVING COUNT(*) > 1;

SELECT agent_id, cohort_id, decision_week, COUNT(*)
FROM decisions
GROUP BY agent_id, cohort_id, decision_week
HAVING COUNT(*) > 1;
```

Resolve those before relying on the current uniqueness guarantees.
