export const MARKET_TABLES_SQL = `
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
  FOREIGN KEY (market_id) REFERENCES markets(id)
);
`;
