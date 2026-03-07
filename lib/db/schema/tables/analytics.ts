export const ANALYTICS_TABLES_SQL = `
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
`;
