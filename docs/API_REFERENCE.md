# API Reference

Comprehensive route documentation for the current Forecaster Arena implementation.

> Documentation status: updated for the current codebase on March 7, 2026.

---

## Base URLs

```text
Development: http://localhost:3000
Production:  https://forecasterarena.com
```

---

## Authentication Model

### Public routes

No authentication required.

### Cron routes

All `/api/cron/*` routes require:

```http
Authorization: Bearer {CRON_SECRET}
```

Behavior:

- missing or invalid token returns `401`
- production fails closed if `CRON_SECRET` is not configured

### Admin routes

Admin routes use a signed HTTP-only session cookie set by:

```http
POST /api/admin/login
```

Cookie details:

- name: `forecaster_admin`
- lifetime: 7 days
- attributes: `HttpOnly`, `SameSite=Lax`, `Secure` in production

---

## Response Conventions

The codebase does **not** enforce one universal envelope for every route. In practice:

- most read endpoints return a JSON object plus `updated_at`
- most error responses use:

```json
{ "error": "..." }
```

- some cron/admin endpoints return task-style payloads such as:

```json
{
  "success": true,
  "duration_ms": 1234
}
```

### Common status codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Invalid input |
| `401` | Missing / invalid auth |
| `404` | Resource not found |
| `429` | Rate limited |
| `500` | Internal error |
| `503` | Service unavailable / health failure / auth not configured |

### Production error redaction

Public routes that use `safeErrorMessage(...)` return a generic internal error string in production. Explicit validation failures and `404`s still return specific messages.

---

## Cache Behavior

| Route group | Cache behavior |
|-------------|----------------|
| `/api/leaderboard` | `public, max-age=15, stale-while-revalidate=45` |
| `/api/performance-data` | `public, max-age=15, stale-while-revalidate=45` |
| `/api/markets` | `no-store` |
| `/api/decisions/recent` | `public, max-age=120, stale-while-revalidate=30` |
| Admin routes | `no-store` / uncached |
| Other dynamic routes | dynamic route handlers, uncached unless explicitly set otherwise |

---

## Public Routes

### GET /api/health

Returns redacted health state for monitoring.

```http
GET /api/health
```

Response shape:

```json
{
  "status": "ok | error",
  "timestamp": "2026-03-06T17:46:51.671Z",
  "checks": {
    "database": {
      "status": "ok | error",
      "message": "Database unavailable"
    },
    "environment": {
      "status": "ok | error",
      "message": "Required configuration is incomplete"
    },
    "data_integrity": {
      "status": "ok | error",
      "message": "Integrity issues detected"
    }
  }
}
```

Important semantics:

- exact missing env var names are **not** exposed publicly
- raw database exception messages are **not** exposed publicly
- health returns:
  - `200` when all checks are `ok`
  - `503` when any check fails

### GET /api/leaderboard

Returns aggregate leaderboard data and cohort summaries.

```http
GET /api/leaderboard
```

Response shape:

```json
{
  "leaderboard": [
    {
      "family_slug": "openai-gpt",
      "family_id": "openai-gpt",
      "legacy_model_id": "gpt-5.1",
      "display_name": "GPT-5.5",
      "provider": "OpenAI",
      "color": "#10B981",
      "total_pnl": 0,
      "total_pnl_percent": 0,
      "avg_brier_score": null,
      "num_cohorts": 1,
      "num_resolved_bets": 0,
      "win_rate": null
    }
  ],
  "cohorts": [
    {
      "id": "cohort-id",
      "cohort_number": 1,
      "started_at": "2026-03-02T00:00:00.000Z",
      "status": "active",
      "methodology_version": "v1",
      "is_archived": true,
      "archived_at": "2026-04-30 00:00:00",
      "archive_reason": "Historical v1 cohort archived for v2 scoring",
      "scoring_status": "archived",
      "decision_eligible": false,
      "decision_status": "tracking_only",
      "num_agents": 7,
      "total_markets_traded": 12
    }
  ],
  "updated_at": "2026-03-06T17:00:00.000Z"
}
```

Notes:

- leaderboard rows only appear for models that actually have cohort history
- `family_slug` is the clearest canonical route key for public model-family navigation
- `legacy_model_id` is compatibility metadata only
- `display_name` is the family-facing label used for comparison views
- the exact release used by any historical cohort is derived from frozen agent lineage, not directly from the mutable `models` table
- leaderboard aggregate rows exclude archived v1 cohorts; cohort summaries still include archive metadata so historical sections can link to them
- the endpoint keeps a short-lived in-process cache to avoid recomputing the aggregate leaderboard on every page load

### GET /api/performance-data

Returns chart-ready snapshot data, optionally scoped to a cohort.

```http
GET /api/performance-data?range=1M
GET /api/performance-data?range=1W&cohort_id=<cohort-id>
```

Query parameters:

| Param | Required | Values | Notes |
|------|----------|--------|-------|
| `range` | No | `10M`, `1H`, `1D`, `1W`, `1M`, `3M`, `ALL` | defaults to `1M` |
| `cohort_id` | No | cohort UUID | restricts snapshots to one cohort |

Response shape:

```json
{
  "data": [
    {
      "date": "2026-03-06T17:40:00.000Z",
      "openai-gpt": 10120.5,
      "google-gemini": 9955.25
    }
  ],
  "models": [
    {
      "id": "openai-gpt",
      "slug": "openai-gpt",
      "legacy_model_id": "gpt-5.1",
      "displayName": "GPT-5.5",
      "color": "#10B981"
    }
  ],
  "range": "1M",
  "updated_at": "2026-03-06T17:40:00.000Z"
}
```

Notes:

- the global chart series is bucketed server-side to keep payloads small
- the snapshot cron refreshes a persisted chart cache for the global ranges, so cold loads after app restarts avoid recomputing the full month-range series
- `release_changes` marks family release rollovers so charts can annotate where generation shifts occurred
- global and family-scoped charts exclude archived cohorts; a direct `cohort_id` request may return archived cohort history for drilldown pages

Important semantics:

- timestamps are `snapshot_timestamp`, not daily buckets
- when multiple cohorts share a timestamp for the same model, values are averaged

### GET /api/markets

Returns a paginated market list with filters and aggregate stats.

```http
GET /api/markets
GET /api/markets?status=active&sort=volume&limit=50&offset=0
GET /api/markets?search=election&category=Politics&cohort_bets=true
```

Query parameters:

| Param | Required | Values | Notes |
|------|----------|--------|-------|
| `status` | No | `active`, `closed`, `resolved`, `all` | defaults to `active` |
| `category` | No | string | exact category filter |
| `search` | No | string | substring match against `question` |
| `sort` | No | `volume`, `close_date`, `created` | defaults to `volume` |
| `cohort_bets` | No | `true` | only markets with open positions in the active cohort |
| `limit` | No | integer | defaults to `50`, capped at `100` |
| `offset` | No | integer | defaults to `0` |

Response shape:

```json
{
  "markets": [
    {
      "id": "market-id",
      "polymarket_id": "pm-id",
      "question": "Will ...?",
      "category": "Politics",
      "market_type": "binary",
      "current_price": 0.57,
      "volume": 123456,
      "close_date": "2026-03-20T00:00:00.000Z",
      "status": "active",
      "positions_count": 3
    }
  ],
  "total": 120,
  "has_more": true,
  "categories": ["Politics", "Crypto"],
  "stats": {
    "total_markets": 1200,
    "active_markets": 800,
    "markets_with_positions": 45,
    "categories_count": 12
  },
  "updated_at": "2026-03-06T17:00:00.000Z"
}
```

### GET /api/markets/[id]

Returns one market plus open positions, recent trades, and optional Brier scores.

```http
GET /api/markets/<market-id>
```

Response shape:

```json
{
  "market": {
    "id": "market-id",
    "polymarket_id": "pm-id",
    "slug": "optional-polymarket-slug",
    "event_slug": "optional-event-slug",
    "question": "Will ...?",
    "description": "...",
    "category": "Politics",
    "market_type": "binary",
    "current_price": 0.57,
    "volume": 123456,
    "liquidity": 40000,
    "close_date": "2026-03-20T00:00:00.000Z",
    "status": "active",
    "resolution_outcome": null,
    "resolved_at": null
  },
  "positions": [
    {
      "id": "position-id",
      "agent_id": "agent-id",
      "family_slug": "openai-gpt",
      "family_id": "openai-gpt",
      "legacy_model_id": "gpt-5.1",
      "model_display_name": "GPT-5.5",
      "model_color": "#10B981",
      "side": "YES",
      "shares": 10,
      "avg_entry_price": 0.5,
      "total_cost": 5,
      "current_value": 5.7,
      "unrealized_pnl": 0.7,
      "decision_id": "opening-decision-id"
    }
  ],
  "trades": [],
  "brier_scores": [],
  "updated_at": "2026-03-06T17:00:00.000Z"
}
```

Notes:

- `positions` only includes **open** positions on the market
- `brier_scores` is only populated for resolved markets
- the route attempts to reconstruct the opening `decision_id` even for legacy trades that omitted `position_id`
- `family_slug` is the clearest canonical model-family key for links and grouping inside `positions`, `trades`, and `brier_scores`

### GET /api/models/[id]

Returns aggregate performance for one benchmark family across cohorts.

```http
GET /api/models/openai-gpt
```

Path parameter:

| Param | Meaning |
|------|---------|
| `id` | canonical family slug, e.g. `openai-gpt`, `google-gemini` |

Response shape:

```json
{
  "model": {
    "id": "openai-gpt",
    "family_id": "openai-gpt",
    "slug": "openai-gpt",
    "legacy_model_id": "gpt-5.1",
    "display_name": "GPT-5.5",
    "provider": "OpenAI",
    "color": "#10B981",
    "current_release_id": "openai-gpt--gpt-5.5",
    "current_release_name": "GPT-5.5"
  },
  "num_cohorts": 3,
  "total_pnl": 420.5,
  "avg_pnl_percent": 1.4,
  "avg_brier_score": 0.18,
  "win_rate": 0.61,
  "cohort_performance": [],
  "recent_decisions": [],
  "equity_curve": [
    {
      "snapshot_timestamp": "2026-03-06T17:40:00.000Z",
      "total_value": 10120.5
    }
  ],
  "updated_at": "2026-03-06T17:40:00.000Z"
}
```

Important semantics:

- `equity_curve` is aggregated across cohorts by timestamp and averaged when needed
- `win_rate` is based on resolved `BUY` trades only

### GET /api/cohorts/[id]

Returns cohort-level leaderboard, stats, and equity curves.

```http
GET /api/cohorts/<cohort-id>
```

Response shape:

```json
{
  "cohort": {
    "id": "cohort-id",
    "cohort_number": 4,
    "started_at": "2026-03-02T00:00:00.000Z",
    "status": "active",
    "completed_at": null,
    "methodology_version": "v1",
    "initial_balance": 10000,
    "is_archived": true,
    "archived_at": "2026-04-30 00:00:00",
    "archive_reason": "Historical v1 cohort archived for v2 scoring",
    "scoring_status": "archived",
    "decision_eligible": false,
    "decision_status": "tracking_only"
  },
  "agents": [
    {
      "id": "agent-id",
      "family_slug": "openai-gpt",
      "family_id": "openai-gpt",
      "legacy_model_id": "gpt-5.1",
      "model_display_name": "GPT-5.5",
      "model_color": "#10B981",
      "cash_balance": 9400,
      "total_invested": 600,
      "status": "active",
      "total_value": 10075,
      "total_pnl": 75,
      "total_pnl_percent": 0.75,
      "brier_score": null,
      "position_count": 2,
      "trade_count": 3,
      "num_resolved_bets": 0
    }
  ],
  "stats": {
    "week_number": 1,
    "total_trades": 14,
    "total_positions_open": 9,
    "markets_with_positions": 7,
    "avg_brier_score": null
  },
  "equity_curves": {
    "openai-gpt": [
      { "date": "2026-03-06T17:40:00.000Z", "value": 10075 }
    ]
  },
  "recent_decisions": [],
  "updated_at": "2026-03-06T17:40:00.000Z"
}
```

Notes:

- `family_slug` is the clearest canonical model-family key for cohort leaderboard links and chart series

### GET /api/cohorts/[id]/models/[familySlugOrLegacyId]

Returns one benchmark family's detailed state within one cohort.

```http
GET /api/cohorts/<cohort-id>/models/openai-gpt
```

Response shape:

```json
{
  "cohort": {
    "id": "cohort-id",
    "cohort_number": 4,
    "status": "active",
    "started_at": "2026-03-02T00:00:00.000Z",
    "completed_at": null,
    "current_week": 1,
    "total_markets": 7
  },
  "model": {
    "id": "openai-gpt",
    "family_slug": "openai-gpt",
    "slug": "openai-gpt",
    "legacy_model_id": "gpt-5.1",
    "display_name": "GPT-5.5",
    "provider": "OpenAI",
    "color": "#10B981"
  },
  "agent": {
    "id": "agent-id",
    "family_slug": "openai-gpt",
    "family_id": "openai-gpt",
    "status": "active",
    "cash_balance": 9400,
    "total_invested": 600,
    "total_value": 10075,
    "total_pnl": 75,
    "total_pnl_percent": 0.75,
    "brier_score": null,
    "num_resolved_bets": 0,
    "rank": 2,
    "total_agents": 7
  },
  "stats": {
    "position_count": 2,
    "trade_count": 3,
    "win_rate": null,
    "cohort_avg_pnl_percent": 0.24,
    "cohort_best_pnl_percent": 1.1,
    "cohort_worst_pnl_percent": -0.3
  },
  "equity_curve": [],
  "decisions": [],
  "positions": [],
  "closed_positions": [],
  "trades": [],
  "updated_at": "2026-03-06T17:40:00.000Z"
}
```

### GET /api/decisions/recent

Returns recent non-error decisions across cohorts.

```http
GET /api/decisions/recent
GET /api/decisions/recent?limit=25
```

Query parameters:

| Param | Required | Notes |
|------|----------|-------|
| `limit` | No | defaults to `10`, capped at `50` |

Response shape:

```json
{
  "decisions": [
    {
      "id": "decision-id",
      "agent_id": "agent-id",
      "cohort_id": "cohort-id",
      "decision_week": 1,
      "decision_timestamp": "2026-03-06T17:00:00.000Z",
      "action": "HOLD",
      "reasoning": "No trade",
      "model_display_name": "GPT-5.5",
      "model_color": "#10B981",
      "cohort_number": 4
    }
  ],
  "updated_at": "2026-03-06T17:00:00.000Z"
}
```

### GET /api/decisions/[id]

Returns one decision plus its associated trades.

```http
GET /api/decisions/<decision-id>
```

Response shape:

```json
{
  "decision": {
    "id": "decision-id",
    "agent_id": "agent-id",
    "cohort_id": "cohort-id",
    "decision_week": 1,
    "decision_timestamp": "2026-03-06T17:00:00.000Z",
    "prompt_system": "...",
    "prompt_user": "...",
    "raw_response": "...",
    "parsed_response": "...",
    "retry_count": 0,
    "action": "BET",
    "reasoning": "...",
    "tokens_input": 100,
    "tokens_output": 50,
    "api_cost_usd": 0.01,
    "response_time_ms": 2400,
    "error_message": null,
    "model_name": "GPT-5.5",
    "model_color": "#10B981",
    "model_provider": "OpenAI",
    "family_slug": "openai-gpt",
    "model_family_id": "openai-gpt",
    "legacy_model_id": "gpt-5.1",
    "model_release_name": "GPT-5.5"
  },
  "trades": [
    {
      "id": "trade-id",
      "market_id": "market-id",
      "market_question": "Will ...?",
      "market_slug": "optional-market-slug",
      "market_event_slug": "optional-event-slug"
    }
  ]
}
```

Notes:

- the path segment accepts the canonical `family_slug` and still tolerates historical legacy ids as compatibility aliases
- `model.id` and `model.family_slug` both identify the canonical benchmark family; `legacy_model_id` is compatibility metadata only
- `agent.family_slug` is the clearest route/link key for the cohort-bound benchmark family

---

## Admin Routes

All admin routes require a valid `forecaster_admin` cookie except the login route itself.

### POST /api/admin/login

Authenticates the admin session.

```http
POST /api/admin/login
Content-Type: application/json
```

Body:

```json
{
  "password": "your-admin-password"
}
```

Responses:

- `200`:

```json
{ "success": true }
```

- `400`: missing password
- `401`: invalid password
- `429`: too many attempts
- `503`: admin auth not configured in production

### DELETE /api/admin/login

Logs out the current admin session.

```http
DELETE /api/admin/login
```

Response:

```json
{ "success": true }
```

### GET /api/admin/stats

Returns high-level admin dashboard stats.

```json
{
  "active_cohorts": 1,
  "total_agents": 7,
  "markets_tracked": 1234,
  "total_api_cost": 12.34,
  "updated_at": "2026-03-06T17:00:00.000Z"
}
```

### GET /api/admin/benchmark

Returns the current lineage control-plane snapshot used by the admin benchmark page.

Response shape:

```json
{
  "default_config_id": "lineup-2026-05-latest-exact",
  "latest_review": {
    "id": "review-id",
    "status": "open",
    "checked_at": "2026-05-04T09:00:00.000Z",
    "candidate_count": 1,
    "target_config_id": null,
    "candidates": [
      {
        "family_id": "openai-gpt",
        "current_release_id": "openai-gpt--gpt-5.5",
        "current_openrouter_id": "openai/gpt-5.5",
        "candidate_openrouter_id": "openai/gpt-5.6",
        "candidate_name": "GPT-5.6",
        "input_price_per_million": 6,
        "output_price_per_million": 18,
        "decision": "upgrade",
        "reason": "Newer general-purpose OpenRouter release matched the family rules"
      }
    ]
  },
  "families": [
    {
      "id": "openai-gpt",
      "public_display_name": "GPT",
      "current_release_id": "openai-gpt--gpt-5.5",
      "current_release_name": "GPT-5.5",
      "releases": [
        {
          "id": "openai-gpt--gpt-5.5",
          "release_name": "GPT-5.5",
          "openrouter_id": "openai/gpt-5.5",
          "default_input_price_per_million": 5,
          "default_output_price_per_million": 30
        }
      ]
    }
  ],
  "configs": [
    {
      "id": "lineup-2026-05-latest-exact",
      "version_name": "lineup-2026-05-latest-exact",
      "is_default_for_future_cohorts": 1,
      "models": [
        {
          "family_id": "openai-gpt",
          "release_id": "openai-gpt--gpt-5.5",
          "release_display_name_snapshot": "GPT-5.5"
        }
      ]
    }
  ],
  "updated_at": "2026-03-07T00:00:00.000Z"
}
```

### POST /api/admin/benchmark/releases

Registers a new exact release for an existing family.

Body:

```json
{
  "family_id": "openai-gpt",
  "release_name": "GPT-5.4",
  "openrouter_id": "openai/gpt-5.4",
  "default_input_price_per_million": 6,
  "default_output_price_per_million": 18,
  "notes": "Optional operator note"
}
```

### POST /api/admin/benchmark/configs

Creates a future benchmark lineup without affecting active or historical cohorts.

Body:

```json
{
  "version_name": "lineup-2026-03-gpt54",
  "methodology_version": "v1",
  "notes": "Promote GPT-5.4 for the next cohort",
  "assignments": [
    {
      "family_id": "openai-gpt",
      "release_id": "openai-gpt--gpt-5.4",
      "input_price_per_million": 6,
      "output_price_per_million": 18
    }
  ]
}
```

### POST /api/admin/benchmark/default

Promotes a benchmark config for future cohort creation.

Body:

```json
{
  "config_id": "lineup-config-id"
}
```

### POST /api/admin/benchmark/reviews/check

Runs a read-only OpenRouter catalog scan and stores a lineup review row. This
does not create releases, promote configs, or roll active cohorts.

### POST /api/admin/benchmark/reviews/:id/approve

Approves selected upgrade candidates from an open review. The server creates
missing `model_releases`, creates a complete `benchmark_config`, and promotes
that config for future cohorts only.

### POST /api/admin/benchmark/reviews/:id/dismiss

Marks an open, failed, or no-change lineup review as dismissed without changing
the default config.

### GET /api/admin/costs

Returns cost data aggregated by model family and overall summary.

```json
{
  "costs_by_model": [
    {
      "family_id": "openai-gpt",
      "family_slug": "openai-gpt",
      "legacy_model_id": "gpt-5.1",
      "model_name": "GPT-5.5",
      "color": "#10B981",
      "total_cost": 0.25,
      "total_input_tokens": 12000,
      "total_output_tokens": 3000,
      "decision_count": 6
    }
  ],
  "summary": {
    "total_cost": 1.1,
    "total_input_tokens": 50000,
    "total_output_tokens": 13000,
    "total_decisions": 42,
    "avg_cost_per_decision": 0.02619
  },
  "updated_at": "2026-03-06T17:00:00.000Z"
}
```

Notes:

- `family_slug` is the clearest canonical family-facing key for admin/UI linking
- `family_id` is the stable lineage identifier used internally
- `legacy_model_id` preserves the old roster key when one exists

### GET /api/admin/logs

Returns recent system logs.

```http
GET /api/admin/logs
GET /api/admin/logs?severity=error&limit=200
```

Query parameters:

| Param | Required | Notes |
|------|----------|-------|
| `severity` | No | `info`, `warning`, `error`, or `all` |
| `limit` | No | defaults to `100`, capped at `500` |

Response:

```json
{
  "logs": [
    {
      "id": "log-id",
      "event_type": "decisions_run_complete",
      "event_data": "{\"cohorts_processed\":1}",
      "severity": "info",
      "created_at": "2026-03-06T17:00:00.000Z"
    }
  ],
  "updated_at": "2026-03-06T17:00:00.000Z"
}
```

### POST /api/admin/action

Triggers a bounded set of admin actions from the dashboard.

```http
POST /api/admin/action
Content-Type: application/json
```

Body:

```json
{
  "action": "start-cohort | sync-markets | check-cohorts | backup",
  "force": true
}
```

Behavior by action:

| Action | Result |
|--------|--------|
| `start-cohort` | starts or reuses the current week's cohort |
| `sync-markets` | runs market sync |
| `check-cohorts` | completes cohorts whose open positions are fully gone |
| `backup` | creates a SQLite backup via the backup API |

### POST /api/admin/export

Creates a bounded CSV export and ZIP archive.

```http
POST /api/admin/export
Content-Type: application/json
```

Body:

```json
{
  "cohort_id": "cohort-id",
  "from": "2026-03-01T00:00:00.000Z",
  "to": "2026-03-02T00:00:00.000Z",
  "tables": ["decisions", "trades"],
  "include_prompts": false
}
```

Rules:

- `cohort_id`, `from`, and `to` are required
- `to` must be after `from`
- max date window: **7 days**
- max rows per exported table: **50,000**
- default tables:
  - `cohorts`
  - `agents`
  - `model_families`
  - `model_releases`
  - `benchmark_configs`
  - `benchmark_config_models`
  - `agent_benchmark_identity` (canonical frozen family/release/config lineage per agent)
  - `api_costs`
  - `markets`
  - `decisions`
  - `trades`
  - `positions`
  - `portfolio_snapshots`
- optional compatibility table:
  - `models`
- ZIP filenames are sanitized and generated server-side
- exports are cleaned up after roughly 24 hours
- historical identity should be reconstructed from `agent_benchmark_identity`, `model_families`, `model_releases`, `benchmark_configs`, `benchmark_config_models`, and frozen lineage columns on `agents` / `api_costs`, not from the mutable `models` table alone

Success response:

```json
{
  "success": true,
  "download_url": "/api/admin/export?file=export-cohort-id-2026-03-06T17-00-00-000Z.zip",
  "info": {
    "cohort_id": "cohort-id",
    "from": "2026-03-01T00:00:00.000Z",
    "to": "2026-03-02T00:00:00.000Z",
    "tables": ["decisions", "trades"],
    "include_prompts": false
  }
}
```

### GET /api/admin/export

Downloads a previously generated ZIP archive.

```http
GET /api/admin/export?file=export-cohort-id-2026-03-06T17-00-00-000Z.zip
```

Response:

- `200` with `application/zip`
- `404` if missing or already cleaned up

---

## Cron Routes

All cron routes require `Authorization: Bearer {CRON_SECRET}`.

### POST /api/cron/start-cohort

Starts the current week's cohort if conditions are met.

```http
POST /api/cron/start-cohort
POST /api/cron/start-cohort?force=true
```

Success response:

```json
{
  "success": true,
  "cohort_id": "cohort-id",
  "cohort_number": 4,
  "agents_created": 7
}
```

If the start window is not met and `force` is absent, response is:

```json
{
  "success": false,
  "message": "Not Sunday or outside start window"
}
```

### POST /api/cron/run-decisions

Runs weekly decisions for unarchived active cohorts inside the latest decision
window. Older current v2 cohorts remain tracking-only for snapshots,
resolution, and current leaderboard accounting. Archived v1 cohorts are not
processed by this route.

```http
POST /api/cron/run-decisions
```

Current behavior:

- route budget: `maxDuration = 600`
- model calls are sequential
- the route ensures the current week's cohort exists before the run
- default decision window is the newest `5` cohort numbers, configurable with `DECISION_COHORT_LIMIT`
- all unarchived active cohorts may refresh to the default lineup, but only decision-eligible cohorts make new LLM calls

Response shape:

```json
{
  "success": true,
  "cohort_bootstrap": {
    "cohort_id": "cohort-id",
    "cohort_number": 4
  },
  "lineup_refresh": {
    "updated_cohorts": 6,
    "updated_agents": 42
  },
  "decision_cohort_limit": 5,
  "tracking_active_cohorts": 8,
  "decision_eligible_cohorts": 5,
  "cohorts_processed": 1,
  "total_agents": 7,
  "total_errors": 0,
  "duration_ms": 12345,
  "results": []
}
```

### POST /api/cron/sync-markets

Runs Polymarket market sync.

```json
{
  "success": true,
  "markets_added": 12,
  "markets_updated": 188,
  "errors": [],
  "duration_ms": 4312
}
```

### POST /api/cron/check-resolutions

Checks closed markets for resolution and settles positions.

```json
{
  "success": true,
  "markets_checked": 23,
  "markets_resolved": 4,
  "positions_settled": 9,
  "cohorts_completed": 1,
  "errors": 0,
  "duration_ms": 1840
}
```

### POST /api/cron/take-snapshots

Updates open-position MTM values and records timestamped snapshots.

```json
{
  "success": true,
  "snapshots_taken": 7,
  "positions_updated": 13,
  "errors": 0,
  "duration_ms": 620
}
```

Notes:

- snapshots are keyed by `snapshot_timestamp`
- routine snapshots are written for unarchived active cohorts only
- closed-but-unresolved positions try to preserve prior value if current price feeds become unhelpful

### POST /api/cron/backup

Creates a SQLite backup.

```json
{
  "success": true,
  "backup_path": "backups/forecaster-2026-03-06T17-00-00-000Z.db",
  "duration_ms": 140
}
```

### POST /api/cron/check-model-lineup

Runs the same read-only OpenRouter lineup review as the admin check action.
This route only writes a review row and never calls paid model completions.

```json
{
  "success": true,
  "review_id": "review-id",
  "status": "open",
  "candidate_count": 1,
  "checked_at": "2026-05-04T09:00:00.000Z"
}
```

Notes:

- `decision.family_slug` is the clearest canonical benchmark-family key
- `decision.model_release_name` identifies the exact frozen release used when the decision was made

---

## Family Slugs and Route Parameters

Canonical public routes are family-based:

| Family Slug | Display Name | Example Current Release |
|-------------|--------------|-------------------------|
| `openai-gpt` | GPT | GPT-5.5 |
| `google-gemini` | Gemini | Gemini 3.1 Pro Preview |
| `xai-grok` | Grok | Grok 4.3 |
| `anthropic-claude-opus` | Claude Opus | Claude Opus 4.7 |
| `deepseek-v3` | DeepSeek | DeepSeek V4 Pro |
| `moonshot-kimi` | Kimi | Kimi K2.6 |
| `alibaba-qwen` | Qwen | Qwen 3.6 Max Preview |

Canonical examples:

- `/api/models/openai-gpt`
- `/api/cohorts/<id>/models/google-gemini`

Legacy roster IDs are still accepted as compatibility aliases and redirect or resolve to the canonical family slug when possible:

- `/api/models/gpt-5.1`
- `/api/cohorts/<id>/models/gemini-2.5-flash`

---

## Operational Notes for Integrators

- admin and cron routes should be treated as **operational APIs**, not public product APIs
- `/api/health` is safe for uptime checks but intentionally redacted
- the public site can legitimately return empty leaderboard / market arrays on a fresh database
- performance charts are based on timestamped snapshots, not one snapshot per day
- decision rows are unique per `(agent_id, cohort_id, decision_week)` even though reruns may overwrite the claimed row
