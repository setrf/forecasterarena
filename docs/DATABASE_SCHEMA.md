# Database Schema Reference

Last updated: 2026-03-07

- Database engine: SQLite
- Driver: `better-sqlite3`
- Default path: `data/forecaster.db`

This document describes the schema that the application currently initializes in
`lib/db/schema.ts`. It is intended to be the implementation-aligned reference
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

models ----< agents
models ----< api_costs
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
| `initial_balance` | `REAL` | Not null, default `10000.00` |
| `created_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Foreign keys:

- `methodology_version -> methodology_versions(version)`

Uniqueness:

- `cohort_number` is unique
- `started_at` is also uniquely indexed so only one cohort can exist for a
  given normalized week start

Why `started_at` uniqueness matters:

- the application creates cohorts by normalized Sunday `00:00 UTC`
- duplicate week creation would corrupt aggregated cohort comparisons

---

### 3.3 `models`

Reference table for the active model roster.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key; stable internal identifier |
| `openrouter_id` | `TEXT` | Not null, unique |
| `display_name` | `TEXT` | Not null |
| `provider` | `TEXT` | Not null |
| `color` | `TEXT` | Nullable |
| `is_active` | `INTEGER` | Default `1` |
| `added_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Current seeded roster in code:

| `id` | `display_name` |
|------|----------------|
| `gpt-5.1` | `GPT-5.2` |
| `gemini-2.5-flash` | `Gemini 3 Pro` |
| `grok-4` | `Grok 4.1` |
| `claude-opus-4.5` | `Claude Opus 4.5` |
| `deepseek-v3.1` | `DeepSeek V3.2` |
| `kimi-k2` | `Kimi K2` |
| `qwen-3-next` | `Qwen 3` |

Important note:

- the stable internal `id` is not guaranteed to match the newest display name

---

### 3.4 `agents`

Represents one model instance inside one cohort.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key |
| `cohort_id` | `TEXT` | Not null |
| `model_id` | `TEXT` | Not null |
| `cash_balance` | `REAL` | Not null, default `10000.00` |
| `total_invested` | `REAL` | Not null, default `0.00` |
| `status` | `TEXT` | Not null, default `active` |
| `created_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Foreign keys:

- `cohort_id -> cohorts(id)`
- `model_id -> models(id)`

Uniqueness:

- `UNIQUE(cohort_id, model_id)`

This is what guarantees one agent per model per cohort.

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

This table is what enables intraday chart ranges such as `10M`, `1H`, and `1D`.

---

### 3.10 `brier_scores`

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

### 3.11 `api_costs`

Optional cost-tracking table for model usage.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT` | Primary key |
| `model_id` | `TEXT` | Not null |
| `decision_id` | `TEXT` | Nullable |
| `tokens_input` | `INTEGER` | Nullable |
| `tokens_output` | `INTEGER` | Nullable |
| `cost_usd` | `REAL` | Nullable |
| `recorded_at` | `TEXT` | Defaults to `CURRENT_TIMESTAMP` |

Foreign keys:

- `model_id -> models(id)`
- `decision_id -> decisions(id)`

Note:

- the main decision flow also stores estimated cost directly on `decisions`

---

### 3.12 `system_logs`

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

- `UNIQUE(cohort_id, model_id)` on `agents`
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
portfolio values across cohorts when needed.

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
