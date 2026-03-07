export const TABLES_SQL = `
-- ============================================================================
-- METHODOLOGY VERSIONS
-- ============================================================================
-- Tracks benchmark methodology versions for reproducibility.
-- Each version is immutable once created.

CREATE TABLE IF NOT EXISTS methodology_versions (
  version TEXT PRIMARY KEY,                      -- 'v1', 'v2', etc.
  title TEXT NOT NULL,                           -- Version title
  description TEXT NOT NULL,                     -- Full description
  changes_summary TEXT,                          -- Changes from previous
  effective_from_cohort INTEGER,                 -- First cohort using this
  document_hash TEXT,                            -- SHA256 of methodology doc
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- COHORTS
-- ============================================================================
-- Each cohort is a weekly competition instance.
-- New cohort starts every Sunday at 00:00 UTC.
-- Cohorts run until all bets resolve (no artificial time limit).

CREATE TABLE IF NOT EXISTS cohorts (
  id TEXT PRIMARY KEY,                           -- UUID
  cohort_number INTEGER NOT NULL UNIQUE,         -- Sequential: 1, 2, 3...
  started_at TEXT NOT NULL,                      -- ISO8601 timestamp
  status TEXT NOT NULL DEFAULT 'active',         -- active | completed
  completed_at TEXT,                             -- When all bets resolved
  methodology_version TEXT NOT NULL DEFAULT 'v1',-- Version used
  initial_balance REAL NOT NULL DEFAULT 10000.00,-- Starting balance
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (methodology_version) REFERENCES methodology_versions(version)
);

-- ============================================================================
-- MODELS
-- ============================================================================
-- The 7 competing LLM models (reference table).
-- Models are added but never deleted to preserve history.

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,                           -- e.g., 'gpt-5.1'
  openrouter_id TEXT NOT NULL UNIQUE,            -- OpenRouter API ID
  display_name TEXT NOT NULL,                    -- Human-readable name
  provider TEXT NOT NULL,                        -- e.g., 'OpenAI'
  color TEXT,                                    -- Hex color for charts
  is_active INTEGER DEFAULT 1,                   -- 1=active, 0=disabled
  added_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- AGENTS
-- ============================================================================
-- An LLM instance within a specific cohort.
-- Each cohort has exactly 7 agents (one per model).

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,                           -- UUID
  cohort_id TEXT NOT NULL,                       -- Links to cohorts
  model_id TEXT NOT NULL,                        -- Links to models
  cash_balance REAL NOT NULL DEFAULT 10000.00,   -- Available cash
  total_invested REAL NOT NULL DEFAULT 0.00,     -- Sum of open positions
  status TEXT NOT NULL DEFAULT 'active',         -- active | bankrupt
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cohort_id) REFERENCES cohorts(id),
  FOREIGN KEY (model_id) REFERENCES models(id),
  UNIQUE(cohort_id, model_id)                    -- One agent per model per cohort
);

-- ============================================================================
-- MARKETS
-- ============================================================================
-- Polymarket prediction markets.
-- Synced from Polymarket's Gamma API.

CREATE TABLE IF NOT EXISTS markets (
  id TEXT PRIMARY KEY,                           -- Internal UUID
  polymarket_id TEXT NOT NULL UNIQUE,            -- Polymarket's ID
  slug TEXT,                                     -- URL slug for Polymarket links
  event_slug TEXT,                               -- Event slug for multi-outcome markets
  question TEXT NOT NULL,                        -- Market question
  description TEXT,                              -- Detailed description
  category TEXT,                                 -- e.g., 'Politics', 'Crypto'
  market_type TEXT NOT NULL DEFAULT 'binary',    -- binary | multi_outcome
  outcomes TEXT,                                 -- JSON array for multi-outcome
  close_date TEXT NOT NULL,                      -- When betting closes
  status TEXT NOT NULL DEFAULT 'active',         -- active|closed|resolved|cancelled
  current_price REAL,                            -- YES price for binary (0-1)
  current_prices TEXT,                           -- JSON for multi-outcome
  volume REAL,                                   -- Total trading volume
  liquidity REAL,                                -- Current liquidity
  resolution_outcome TEXT,                       -- 'YES', 'NO', or outcome name
  resolved_at TEXT,                              -- Resolution timestamp
  first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,  -- When we first synced
  last_updated_at TEXT DEFAULT CURRENT_TIMESTAMP -- Last price update
);

-- ============================================================================
-- POSITIONS
-- ============================================================================
-- Open holdings in markets.
-- One position per agent per market per side.

CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,                           -- UUID
  agent_id TEXT NOT NULL,                        -- Links to agents
  market_id TEXT NOT NULL,                       -- Links to markets
  side TEXT NOT NULL,                            -- 'YES', 'NO', or outcome
  shares REAL NOT NULL,                          -- Number of shares
  avg_entry_price REAL NOT NULL,                 -- Weighted average cost
  total_cost REAL NOT NULL,                      -- Total $ invested
  current_value REAL,                            -- Mark-to-market value
  unrealized_pnl REAL,                           -- Unrealized P/L
  status TEXT NOT NULL DEFAULT 'open',           -- open | closed | settled
  opened_at TEXT DEFAULT CURRENT_TIMESTAMP,      -- When position opened
  closed_at TEXT,                                -- When position closed
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (market_id) REFERENCES markets(id),
  UNIQUE(agent_id, market_id, side)              -- One position per side
);

-- ============================================================================
-- DECISIONS
-- ============================================================================
-- Full LLM decision log with prompts and responses.
-- Critical for reproducibility and analysis.

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,                           -- UUID
  agent_id TEXT NOT NULL,                        -- Links to agents
  cohort_id TEXT NOT NULL,                       -- Links to cohorts
  decision_week INTEGER NOT NULL,                -- Week number in cohort
  decision_timestamp TEXT NOT NULL,              -- When decision was made
  
  -- Full prompts for reproducibility
  prompt_system TEXT NOT NULL,                   -- System prompt sent
  prompt_user TEXT NOT NULL,                     -- User prompt sent
  raw_response TEXT,                             -- Raw LLM response
  parsed_response TEXT,                          -- Parsed JSON response
  retry_count INTEGER DEFAULT 0,                 -- Number of retries
  
  -- Decision outcome
  action TEXT NOT NULL,                          -- BET | SELL | HOLD | ERROR
  reasoning TEXT,                                -- LLM's explanation
  
  -- Metadata
  tokens_input INTEGER,                          -- Tokens in prompt
  tokens_output INTEGER,                         -- Tokens in response
  api_cost_usd REAL,                             -- Estimated cost
  response_time_ms INTEGER,                      -- Response latency
  error_message TEXT,                            -- Error if any
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (cohort_id) REFERENCES cohorts(id)
);

-- ============================================================================
-- TRADES
-- ============================================================================
-- All buy/sell transactions.
-- Every trade links to a decision for audit trail.

CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,                           -- UUID
  agent_id TEXT NOT NULL,                        -- Links to agents
  market_id TEXT NOT NULL,                       -- Links to markets
  position_id TEXT,                              -- Links to positions
  decision_id TEXT,                              -- Links to decisions
  trade_type TEXT NOT NULL,                      -- BUY | SELL
  side TEXT NOT NULL,                            -- 'YES', 'NO', or outcome
  shares REAL NOT NULL,                          -- Number of shares
  price REAL NOT NULL,                           -- Price at execution
  total_amount REAL NOT NULL,                    -- Total $ amount
  implied_confidence REAL,                       -- For Brier score (BUY only)
  cost_basis REAL,                               -- Cost basis of shares (SELL only)
  realized_pnl REAL,                             -- Realized P/L (SELL only)
  executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (market_id) REFERENCES markets(id),
  FOREIGN KEY (position_id) REFERENCES positions(id),
  FOREIGN KEY (decision_id) REFERENCES decisions(id)
);

-- ============================================================================
-- PORTFOLIO SNAPSHOTS
-- ============================================================================
-- Daily snapshots of portfolio state.
-- Used for charts and historical analysis.

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id TEXT PRIMARY KEY,                           -- UUID
  agent_id TEXT NOT NULL,                        -- Links to agents
  snapshot_timestamp TEXT NOT NULL,                   -- YYYY-MM-DD HH:MM:SS
  cash_balance REAL NOT NULL,                    -- Cash at snapshot
  positions_value REAL NOT NULL,                 -- Sum of position values
  total_value REAL NOT NULL,                     -- Cash + positions
  total_pnl REAL NOT NULL,                       -- Total P/L from start
  total_pnl_percent REAL NOT NULL,               -- P/L as percentage
  brier_score REAL,                              -- Cumulative Brier score
  num_resolved_bets INTEGER DEFAULT 0,           -- Number of resolved bets
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  UNIQUE(agent_id, snapshot_timestamp)                -- One snapshot per 10 minutes
);

-- ============================================================================
-- BRIER SCORES
-- ============================================================================
-- Individual bet scoring records.
-- Calculated when markets resolve.

CREATE TABLE IF NOT EXISTS brier_scores (
  id TEXT PRIMARY KEY,                           -- UUID
  agent_id TEXT NOT NULL,                        -- Links to agents
  trade_id TEXT NOT NULL,                        -- Links to trades
  market_id TEXT NOT NULL,                       -- Links to markets
  forecast_probability REAL NOT NULL,            -- Implied probability
  actual_outcome REAL NOT NULL,                  -- 1 (win) or 0 (loss)
  brier_score REAL NOT NULL,                     -- Calculated score
  calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (trade_id) REFERENCES trades(id),
  FOREIGN KEY (market_id) REFERENCES markets(id)
);

-- ============================================================================
-- API COSTS
-- ============================================================================
-- Track API usage and costs per model.
-- For internal monitoring (admin dashboard only).

CREATE TABLE IF NOT EXISTS api_costs (
  id TEXT PRIMARY KEY,                           -- UUID
  model_id TEXT NOT NULL,                        -- Links to models
  decision_id TEXT,                              -- Links to decisions
  tokens_input INTEGER,                          -- Input tokens
  tokens_output INTEGER,                         -- Output tokens
  cost_usd REAL,                                 -- Estimated cost
  recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(id),
  FOREIGN KEY (decision_id) REFERENCES decisions(id)
);

-- ============================================================================
-- SYSTEM LOGS
-- ============================================================================
-- Audit trail for all system events.
-- Critical for debugging and monitoring.

CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,                           -- UUID
  event_type TEXT NOT NULL,                      -- Event category
  event_data TEXT,                               -- JSON payload
  severity TEXT DEFAULT 'info',                  -- info | warning | error
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;
