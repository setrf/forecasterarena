export const BENCHMARK_TABLES_SQL = `
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
  benchmark_config_id TEXT NOT NULL,             -- Frozen lineup/config used
  is_archived INTEGER NOT NULL DEFAULT 0,         -- 1=historical, excluded from current scoring
  archived_at TEXT,                              -- When this cohort was archived
  archive_reason TEXT,                           -- Why this cohort was archived
  initial_balance REAL NOT NULL DEFAULT 10000.00,-- Starting balance
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (methodology_version) REFERENCES methodology_versions(version),
  FOREIGN KEY (benchmark_config_id) REFERENCES benchmark_configs(id)
);

-- ============================================================================
-- MODELS
-- ============================================================================
-- Legacy compatibility records for previously public model IDs.
-- Historical truth lives in families, releases, configs, and frozen agents.

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
-- A frozen benchmark slot assignment within a specific cohort.
-- Each cohort has one agent per benchmark_config_model slot.

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,                           -- UUID
  cohort_id TEXT NOT NULL,                       -- Links to cohorts
  model_id TEXT NOT NULL,                        -- Links to models
  family_id TEXT NOT NULL,                       -- Stable benchmark family
  release_id TEXT NOT NULL,                      -- Frozen exact release
  benchmark_config_model_id TEXT NOT NULL,       -- Frozen config slot
  cash_balance REAL NOT NULL DEFAULT 10000.00,   -- Available cash
  total_invested REAL NOT NULL DEFAULT 0.00,     -- Sum of open positions
  status TEXT NOT NULL DEFAULT 'active',         -- active | bankrupt
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cohort_id) REFERENCES cohorts(id),
  FOREIGN KEY (model_id) REFERENCES models(id),
  FOREIGN KEY (family_id) REFERENCES model_families(id),
  FOREIGN KEY (release_id) REFERENCES model_releases(id),
  FOREIGN KEY (benchmark_config_model_id) REFERENCES benchmark_config_models(id),
  UNIQUE(cohort_id, benchmark_config_model_id)   -- One agent per frozen config slot per cohort
);
`;
