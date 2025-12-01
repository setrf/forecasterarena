# Database Schema Documentation

**Database**: SQLite (better-sqlite3)  
**Location**: `data/forecaster.db`

---

## Overview

Forecaster Arena uses SQLite for data persistence. The schema is designed for:

1. **Full audit trail**: Every decision and trade is logged
2. **Reproducibility**: Prompts and responses stored verbatim
3. **Performance**: Indexes on frequently queried columns
4. **Referential integrity**: Foreign keys enforce relationships

---

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐
│ methodology_    │     │    cohorts      │
│   versions      │◀────│                 │
└─────────────────┘     └────────┬────────┘
                                 │
                                 │ 1:N
                                 ▼
┌─────────────────┐     ┌─────────────────┐
│     models      │◀────│     agents      │
└─────────────────┘     └────────┬────────┘
        │                        │
        │                        │ 1:N
        │               ┌────────┴────────┐
        │               │                 │
        ▼               ▼                 ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   api_costs     │  │   positions     │  │   decisions     │
└─────────────────┘  └────────┬────────┘  └────────┬────────┘
                              │                    │
                              │                    │
                              ▼                    ▼
                     ┌─────────────────┐  ┌─────────────────┐
                     │     trades      │◀─│                 │
                     └────────┬────────┘  └─────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  brier_scores   │
                     └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│    markets      │     │ portfolio_      │
└─────────────────┘     │   snapshots     │
                        └─────────────────┘

┌─────────────────┐
│  system_logs    │
└─────────────────┘
```

---

## Tables

### methodology_versions

Tracks benchmark methodology versions for reproducibility.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| version | TEXT | PRIMARY KEY | Version identifier (e.g., 'v1') |
| title | TEXT | NOT NULL | Version title |
| description | TEXT | NOT NULL | Full description |
| changes_summary | TEXT | | Changes from previous version |
| effective_from_cohort | INTEGER | | First cohort using this version |
| document_hash | TEXT | | SHA256 hash of methodology document |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

---

### cohorts

Weekly competition instances.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| cohort_number | INTEGER | NOT NULL, UNIQUE | Sequential number (1, 2, 3...) |
| started_at | TEXT | NOT NULL | ISO8601 start timestamp |
| status | TEXT | NOT NULL, DEFAULT 'active' | 'active' or 'completed' |
| completed_at | TEXT | | When all bets resolved |
| methodology_version | TEXT | NOT NULL, DEFAULT 'v1' | FK to methodology_versions |
| initial_balance | REAL | NOT NULL, DEFAULT 10000.00 | Starting balance per agent |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

---

### models

The 7 competing LLM models (reference table).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Internal ID (e.g., 'gpt-5.1') |
| openrouter_id | TEXT | NOT NULL, UNIQUE | OpenRouter API identifier |
| display_name | TEXT | NOT NULL | Human-readable name |
| provider | TEXT | NOT NULL | Company name (e.g., 'OpenAI') |
| color | TEXT | | Hex color for charts |
| is_active | INTEGER | DEFAULT 1 | 1=active, 0=disabled |
| added_at | TEXT | DEFAULT CURRENT_TIMESTAMP | When model was added |

---

### agents

LLM instance within a specific cohort.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| cohort_id | TEXT | NOT NULL, FK | Links to cohorts |
| model_id | TEXT | NOT NULL, FK | Links to models |
| cash_balance | REAL | NOT NULL, DEFAULT 10000.00 | Current available cash |
| total_invested | REAL | NOT NULL, DEFAULT 0.00 | Sum of open positions cost |
| status | TEXT | NOT NULL, DEFAULT 'active' | 'active' or 'bankrupt' |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Unique Constraint**: (cohort_id, model_id) - One agent per model per cohort

---

### markets

Polymarket prediction markets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Internal UUID |
| polymarket_id | TEXT | NOT NULL, UNIQUE | Polymarket's market ID |
| question | TEXT | NOT NULL | Market question |
| description | TEXT | | Detailed description |
| category | TEXT | | Category (Politics, Crypto, etc.) |
| market_type | TEXT | NOT NULL, DEFAULT 'binary' | 'binary' or 'multi_outcome' |
| outcomes | TEXT | | JSON array for multi-outcome |
| close_date | TEXT | NOT NULL | When betting closes |
| status | TEXT | NOT NULL, DEFAULT 'active' | active/closed/resolved/cancelled |
| current_price | REAL | | YES price for binary (0-1) |
| current_prices | TEXT | | JSON for multi-outcome prices |
| volume | REAL | | Total trading volume |
| liquidity | REAL | | Current liquidity |
| resolution_outcome | TEXT | | Winning outcome after resolution |
| resolved_at | TEXT | | Resolution timestamp |
| first_seen_at | TEXT | DEFAULT CURRENT_TIMESTAMP | When first synced |
| last_updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Last price update |

---

### positions

Open holdings in markets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| agent_id | TEXT | NOT NULL, FK | Links to agents |
| market_id | TEXT | NOT NULL, FK | Links to markets |
| side | TEXT | NOT NULL | 'YES', 'NO', or outcome name |
| shares | REAL | NOT NULL | Number of shares held |
| avg_entry_price | REAL | NOT NULL | Weighted average cost basis |
| total_cost | REAL | NOT NULL | Total $ invested |
| current_value | REAL | | Mark-to-market value |
| unrealized_pnl | REAL | | Unrealized profit/loss |
| status | TEXT | NOT NULL, DEFAULT 'open' | open/closed/settled |
| opened_at | TEXT | DEFAULT CURRENT_TIMESTAMP | When position opened |
| closed_at | TEXT | | When position closed |

**Unique Constraint**: (agent_id, market_id, side)

---

### decisions

Full LLM decision log.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| agent_id | TEXT | NOT NULL, FK | Links to agents |
| cohort_id | TEXT | NOT NULL, FK | Links to cohorts |
| decision_week | INTEGER | NOT NULL | Week number within cohort |
| decision_timestamp | TEXT | NOT NULL | When decision was made |
| prompt_system | TEXT | NOT NULL | Full system prompt |
| prompt_user | TEXT | NOT NULL | Full user prompt |
| raw_response | TEXT | | Raw LLM response |
| parsed_response | TEXT | | Parsed JSON response |
| retry_count | INTEGER | DEFAULT 0 | Number of retries |
| action | TEXT | NOT NULL | BET/SELL/HOLD/ERROR |
| reasoning | TEXT | | LLM's explanation |
| tokens_input | INTEGER | | Prompt tokens |
| tokens_output | INTEGER | | Response tokens |
| api_cost_usd | REAL | | Estimated API cost |
| response_time_ms | INTEGER | | Response latency |
| error_message | TEXT | | Error if any |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

---

### trades

All buy/sell transactions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| agent_id | TEXT | NOT NULL, FK | Links to agents |
| market_id | TEXT | NOT NULL, FK | Links to markets |
| position_id | TEXT | FK | Links to positions |
| decision_id | TEXT | FK | Links to decisions |
| trade_type | TEXT | NOT NULL | 'BUY' or 'SELL' |
| side | TEXT | NOT NULL | 'YES', 'NO', or outcome |
| shares | REAL | NOT NULL | Number of shares |
| price | REAL | NOT NULL | Price at execution |
| total_amount | REAL | NOT NULL | Total $ amount |
| implied_confidence | REAL | | For Brier score calculation |
| executed_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Execution timestamp |

---

### portfolio_snapshots

Daily portfolio snapshots for charting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| agent_id | TEXT | NOT NULL, FK | Links to agents |
| snapshot_date | TEXT | NOT NULL | YYYY-MM-DD format |
| cash_balance | REAL | NOT NULL | Cash at snapshot |
| positions_value | REAL | NOT NULL | Sum of position values |
| total_value | REAL | NOT NULL | Cash + positions |
| total_pnl | REAL | NOT NULL | P/L from start |
| total_pnl_percent | REAL | NOT NULL | P/L as percentage |
| brier_score | REAL | | Cumulative Brier score |
| num_resolved_bets | INTEGER | DEFAULT 0 | Resolved bet count |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Unique Constraint**: (agent_id, snapshot_date)

---

### brier_scores

Individual bet scoring records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| agent_id | TEXT | NOT NULL, FK | Links to agents |
| trade_id | TEXT | NOT NULL, FK | Links to trades |
| market_id | TEXT | NOT NULL, FK | Links to markets |
| forecast_probability | REAL | NOT NULL | Implied probability (0-1) |
| actual_outcome | REAL | NOT NULL | 1 (correct) or 0 (wrong) |
| brier_score | REAL | NOT NULL | Calculated Brier score |
| calculated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Calculation timestamp |

---

### api_costs

API usage and cost tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| model_id | TEXT | NOT NULL, FK | Links to models |
| decision_id | TEXT | FK | Links to decisions |
| tokens_input | INTEGER | | Input token count |
| tokens_output | INTEGER | | Output token count |
| cost_usd | REAL | | Estimated cost |
| recorded_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Recording timestamp |

---

### system_logs

Audit trail for system events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| event_type | TEXT | NOT NULL | Event category |
| event_data | TEXT | | JSON payload |
| severity | TEXT | DEFAULT 'info' | info/warning/error |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | Event timestamp |

---

## Indexes

```sql
-- Agents
idx_agents_cohort ON agents(cohort_id)
idx_agents_model ON agents(model_id)
idx_agents_status ON agents(status)

-- Positions
idx_positions_agent ON positions(agent_id)
idx_positions_market ON positions(market_id)
idx_positions_status ON positions(status)
idx_positions_agent_status ON positions(agent_id, status)

-- Trades
idx_trades_agent ON trades(agent_id)
idx_trades_market ON trades(market_id)
idx_trades_decision ON trades(decision_id)
idx_trades_executed ON trades(executed_at DESC)

-- Decisions
idx_decisions_agent ON decisions(agent_id)
idx_decisions_cohort ON decisions(cohort_id)
idx_decisions_timestamp ON decisions(decision_timestamp DESC)

-- Portfolio Snapshots
idx_snapshots_agent ON portfolio_snapshots(agent_id)
idx_snapshots_date ON portfolio_snapshots(snapshot_date DESC)
idx_snapshots_agent_date ON portfolio_snapshots(agent_id, snapshot_date DESC)

-- Markets
idx_markets_status ON markets(status)
idx_markets_polymarket ON markets(polymarket_id)
idx_markets_category ON markets(category)
idx_markets_volume ON markets(volume DESC)
idx_markets_close_date ON markets(close_date)

-- Brier Scores
idx_brier_agent ON brier_scores(agent_id)
idx_brier_market ON brier_scores(market_id)

-- System Logs
idx_logs_type ON system_logs(event_type)
idx_logs_severity ON system_logs(severity)
idx_logs_created ON system_logs(created_at DESC)

-- Cohorts
idx_cohorts_status ON cohorts(status)
idx_cohorts_started ON cohorts(started_at DESC)
```

---

## Backup Strategy

- Weekly backup before each new cohort (Saturday 23:00 UTC)
- Backup files stored in `backups/` directory
- Format: `forecaster-YYYY-MM-DDTHH-MM-SS.db`



