export const DECISION_TABLES_SQL = `
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
`;
