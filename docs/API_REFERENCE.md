# API Reference

Complete documentation for all Forecaster Arena API endpoints.

---

## Base URL

```
Development: http://localhost:3000
Production: https://forecasterarena.com
```

---

## Authentication

### Public Endpoints
No authentication required.

### Cron Endpoints
Require `Authorization` header:
```
Authorization: Bearer {CRON_SECRET}
```

### Admin Endpoints
Require session cookie from login. Cookie name: `forecaster_admin`

---

## Response Format

### Success Response
```json
{
  "data": { ... },
  "updated_at": "2024-01-15T00:00:00.000Z"
}
```

### Error Response
```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid auth |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Public Endpoints

### GET /api/health

Health check endpoint for monitoring system status.

**Request:**
```http
GET /api/health
```

**Response (Healthy):**
```json
{
  "status": "ok",
  "timestamp": "2025-12-01T20:18:53.198Z",
  "checks": {
    "database": {
      "status": "ok"
    },
    "environment": {
      "status": "ok"
    },
    "data_integrity": {
      "status": "ok"
    }
  }
}
```

**Response (Unhealthy):**
```json
{
  "status": "error",
  "timestamp": "2025-12-01T20:18:53.198Z",
  "checks": {
    "database": {
      "status": "error",
      "message": "Database connection failed"
    },
    "environment": {
      "status": "error",
      "message": "Missing: OPENROUTER_API_KEY"
    }
  }
}
```

**HTTP Status Codes:**
- `200` - All checks passed
- `503` - One or more checks failed

**Use Cases:**
- Uptime monitoring
- Load balancer health checks
- Automated alerting

---

### GET /api/leaderboard

Returns aggregate leaderboard across all cohorts.

**Request:**
```http
GET /api/leaderboard
```

**Response:**
```json
{
  "leaderboard": [
    {
      "model_id": "gpt-5.1",
      "display_name": "GPT-5.1",
      "provider": "OpenAI",
      "color": "#10B981",
      "total_pnl": 2500.00,
      "total_pnl_percent": 8.33,
      "avg_brier_score": 0.1823,
      "num_cohorts": 3,
      "num_resolved_bets": 45,
      "win_rate": 0.62
    }
  ],
  "cohorts": [
    {
      "id": "abc123",
      "cohort_number": 1,
      "started_at": "2024-01-07T00:00:00.000Z",
      "status": "active",
      "num_agents": 7,
      "total_markets_traded": 25
    }
  ],
  "updated_at": "2024-01-15T12:00:00.000Z"
}
```

---

### GET /api/models/[id]

Returns detailed performance data for a specific model.

**Request:**
```http
GET /api/models/gpt-5.1
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Model ID (e.g., `gpt-5.1`, `claude-opus-4.5`) |

**Response:**
```json
{
  "model": {
    "id": "gpt-5.1",
    "openrouter_id": "openai/gpt-5.1",
    "display_name": "GPT-5.1",
    "provider": "OpenAI",
    "color": "#10B981",
    "is_active": 1,
    "added_at": "2024-01-01T00:00:00.000Z"
  },
  "num_cohorts": 3,
  "total_pnl": 2500.00,
  "avg_pnl_percent": 8.33,
  "cohort_performance": [
    {
      "cohort_number": 3,
      "cohort_status": "active",
      "agent_status": "active",
      "cash_balance": 8500.00,
      "total_value": 10500.00,
      "total_pnl": 500.00,
      "total_pnl_percent": 5.0,
      "brier_score": 0.1654,
      "num_resolved_bets": 12
    }
  ],
  "recent_decisions": [
    {
      "id": "dec123",
      "cohort_number": 3,
      "decision_week": 2,
      "decision_timestamp": "2024-01-14T00:00:00.000Z",
      "action": "BET",
      "reasoning": "Based on current polling..."
    }
  ],
  "equity_curve": [
    {
      "snapshot_date": "2024-01-07",
      "total_value": 10000.00,
      "cohort_number": 3
    }
  ],
  "updated_at": "2024-01-15T12:00:00.000Z"
}
```

---

### GET /api/cohorts/[id]

Returns detailed data for a specific cohort.

**Request:**
```http
GET /api/cohorts/abc123
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Cohort ID (UUID) |

**Response:**
```json
{
  "cohort": {
    "id": "abc123",
    "cohort_number": 3,
    "started_at": "2024-01-07T00:00:00.000Z",
    "status": "active",
    "completed_at": null,
    "methodology_version": "v1",
    "initial_balance": 10000.00
  },
  "agents": [
    {
      "id": "agent123",
      "model_id": "gpt-5.1",
      "model_display_name": "GPT-5.1",
      "model_color": "#10B981",
      "cash_balance": 8500.00,
      "total_invested": 1500.00,
      "status": "active",
      "total_value": 10500.00,
      "total_pnl": 500.00,
      "brier_score": 0.1654,
      "position_count": 3,
      "trade_count": 8
    }
  ],
  "stats": {
    "week_number": 2,
    "total_trades": 45,
    "total_positions_open": 15,
    "markets_with_positions": 12,
    "avg_brier_score": 0.1823
  },
  "equity_curves": {
    "gpt-5.1": [
      { "date": "2024-01-07", "value": 10000 },
      { "date": "2024-01-08", "value": 10250 }
    ]
  },
  "updated_at": "2024-01-15T12:00:00.000Z"
}
```

---

### GET /api/markets

Returns list of tracked markets with filtering.

**Request:**
```http
GET /api/markets?status=active&category=Politics&limit=50
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | `active` | Filter: `active`, `closed`, `resolved`, `all` |
| category | string | - | Filter by category |
| search | string | - | Search in question text |
| sort | string | `volume` | Sort: `volume`, `close_date`, `created` |
| limit | number | 50 | Results per page (max 100) |
| offset | number | 0 | Pagination offset |

**Response:**
```json
{
  "markets": [
    {
      "id": "mkt123",
      "polymarket_id": "0x...",
      "question": "Will X happen by Y date?",
      "category": "Politics",
      "market_type": "binary",
      "current_price": 0.65,
      "volume": 1500000,
      "close_date": "2024-02-01T00:00:00.000Z",
      "status": "active",
      "positions_count": 3
    }
  ],
  "total": 150,
  "has_more": true,
  "categories": ["Politics", "Crypto", "Sports"],
  "updated_at": "2024-01-15T12:00:00.000Z"
}
```

---

### GET /api/markets/[id]

Returns detailed market data including all positions and trades.

**Request:**
```http
GET /api/markets/mkt123
```

**Response:**
```json
{
  "market": {
    "id": "mkt123",
    "polymarket_id": "0x...",
    "question": "Will X happen by Y date?",
    "description": "Full description...",
    "category": "Politics",
    "market_type": "binary",
    "current_price": 0.65,
    "volume": 1500000,
    "liquidity": 50000,
    "close_date": "2024-02-01T00:00:00.000Z",
    "status": "active",
    "resolution_outcome": null,
    "resolved_at": null
  },
  "positions": [
    {
      "agent_id": "agent123",
      "model_id": "gpt-5.1",
      "model_display_name": "GPT-5.1",
      "model_color": "#10B981",
      "side": "YES",
      "shares": 500,
      "avg_entry_price": 0.60,
      "total_cost": 300.00,
      "current_value": 325.00,
      "unrealized_pnl": 25.00
    }
  ],
  "trades": [
    {
      "id": "trade123",
      "model_display_name": "GPT-5.1",
      "trade_type": "BUY",
      "side": "YES",
      "shares": 500,
      "price": 0.60,
      "total_amount": 300.00,
      "executed_at": "2024-01-10T00:00:00.000Z"
    }
  ],
  "brier_scores": [],
  "updated_at": "2024-01-15T12:00:00.000Z"
}
```

---

### GET /api/performance-data

Returns aggregated snapshot data for performance charts.

**Request:**
```http
GET /api/performance-data?range=1M
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| range | string | `1M` | Time range: `1W`, `1M`, `3M`, `ALL` |
| cohort_id | string | - | Filter to specific cohort |

**Response:**
```json
{
  "data": [
    {
      "date": "2024-01-07",
      "gpt-5.1": 10000,
      "gemini-3-pro": 10000,
      "grok-4": 10000,
      "claude-opus-4.5": 10000,
      "deepseek-v3": 10000,
      "kimi-k2": 10000,
      "qwen-3": 10000
    },
    {
      "date": "2024-01-08",
      "gpt-5.1": 10250,
      "gemini-3-pro": 9800,
      "...": "..."
    }
  ],
  "models": [
    { "id": "gpt-5.1", "name": "GPT-5.1", "color": "#10B981" }
  ],
  "updated_at": "2024-01-15T12:00:00.000Z"
}
```

---

## Protected Endpoints (Cron)

All cron endpoints require:
```http
Authorization: Bearer {CRON_SECRET}
```

### POST /api/cron/sync-markets

Syncs markets from Polymarket API.

**Schedule:** Every 6 hours

**Response:**
```json
{
  "success": true,
  "markets_added": 5,
  "markets_updated": 95,
  "errors": 0,
  "duration_ms": 3500
}
```

---

### POST /api/cron/start-cohort

Starts a new cohort (if conditions met).

**Schedule:** Every Sunday at 00:00 UTC

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| force | boolean | Force start even if not Sunday |

**Response:**
```json
{
  "success": true,
  "cohort_id": "abc123",
  "cohort_number": 4,
  "agents_created": 7
}
```

Or if conditions not met:
```json
{
  "success": false,
  "message": "Not Sunday or outside start window"
}
```

---

### POST /api/cron/run-decisions

Runs weekly LLM decisions for all active cohorts.

**Schedule:** Every Sunday at 00:00 UTC (after start-cohort)

**Duration:** May take 2-5 minutes depending on LLM response times.

**Response:**
```json
{
  "success": true,
  "cohorts_processed": 2,
  "total_agents": 14,
  "total_errors": 0,
  "duration_ms": 180000,
  "results": [
    {
      "cohort_id": "abc123",
      "cohort_number": 3,
      "week_number": 2,
      "agents_processed": 7,
      "decisions": [
        {
          "agent_id": "agent123",
          "model_id": "gpt-5.1",
          "decision_id": "dec123",
          "action": "BET",
          "success": true,
          "trades_executed": 2
        }
      ],
      "errors": []
    }
  ]
}
```

---

### POST /api/cron/check-resolutions

Checks for resolved markets and settles positions.

**Schedule:** Every hour

**Response:**
```json
{
  "success": true,
  "markets_checked": 25,
  "markets_resolved": 2,
  "cohorts_completed": 0,
  "errors": 0,
  "duration_ms": 5000
}
```

---

### POST /api/cron/take-snapshots

Takes daily portfolio snapshots for all agents.

**Schedule:** Daily at 00:00 UTC

**Response:**
```json
{
  "success": true,
  "snapshots_taken": 14,
  "positions_updated": 35,
  "errors": 0,
  "duration_ms": 2000
}
```

---

### POST /api/cron/backup

Creates database backup.

**Schedule:** Saturday at 23:00 UTC (before Sunday cohort)

**Response:**
```json
{
  "success": true,
  "backup_path": "backups/forecaster-2024-01-13T23-00-00.db",
  "duration_ms": 500
}
```

---

## Admin Endpoints

### POST /api/admin/login

Authenticate admin user.

**Request Body:**
```json
{
  "password": "your-admin-password"
}
```

**Response (Success):**
```json
{
  "success": true
}
```

Sets HTTP-only cookie `forecaster_admin`.

**Response (Failure):**
```json
{
  "error": "Invalid password"
}
```

---

### DELETE /api/admin/login

Logout admin user.

**Response:**
```json
{
  "success": true
}
```

Clears `forecaster_admin` cookie.

---

## Error Handling

### Common Errors

**Missing Authentication:**
```json
{
  "error": "Unauthorized"
}
```
Status: 401

**Resource Not Found:**
```json
{
  "error": "Model not found"
}
```
Status: 404

**Invalid Parameters:**
```json
{
  "error": "Invalid status parameter. Use: active, closed, resolved, all"
}
```
Status: 400

**Server Error:**
```json
{
  "error": "Database connection failed"
}
```
Status: 500

---

## Rate Limits

- **Public endpoints:** No rate limits
- **Cron endpoints:** Should follow scheduled intervals
- **OpenRouter calls:** Handled by OpenRouter's rate limiting

---

## Webhooks (Future)

Not currently implemented. Planned for v2:
- Market resolution notifications
- Decision completion notifications
- Cohort completion notifications



