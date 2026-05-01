export function createSchema(db) {
  db.exec(`
  CREATE TABLE methodology_versions (
    version TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    changes_summary TEXT,
    effective_from_cohort INTEGER,
    document_hash TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE cohorts (
    id TEXT PRIMARY KEY,
    cohort_number INTEGER NOT NULL UNIQUE,
    started_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    completed_at TEXT,
    methodology_version TEXT NOT NULL DEFAULT 'v1',
    benchmark_config_id TEXT NOT NULL,
    initial_balance REAL NOT NULL DEFAULT 10000.00,
    is_archived INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    archive_reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE models (
    id TEXT PRIMARY KEY,
    openrouter_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    color TEXT,
    is_active INTEGER DEFAULT 1,
    added_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE model_families (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    legacy_model_id TEXT UNIQUE,
    provider TEXT NOT NULL,
    family_name TEXT NOT NULL,
    public_display_name TEXT NOT NULL,
    short_display_name TEXT NOT NULL,
    color TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    retired_at TEXT
  );

  CREATE TABLE model_releases (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    release_name TEXT NOT NULL,
    release_slug TEXT NOT NULL,
    openrouter_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    metadata_json TEXT,
    release_status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    retired_at TEXT,
    first_used_cohort_number INTEGER,
    last_used_cohort_number INTEGER
  );

  CREATE TABLE benchmark_configs (
    id TEXT PRIMARY KEY,
    version_name TEXT NOT NULL UNIQUE,
    methodology_version TEXT NOT NULL,
    notes TEXT,
    created_by TEXT,
    is_default_for_future_cohorts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE benchmark_config_models (
    id TEXT PRIMARY KEY,
    benchmark_config_id TEXT NOT NULL,
    family_id TEXT NOT NULL,
    release_id TEXT NOT NULL,
    slot_order INTEGER NOT NULL,
    family_display_name_snapshot TEXT NOT NULL,
    short_display_name_snapshot TEXT NOT NULL,
    release_display_name_snapshot TEXT NOT NULL,
    provider_snapshot TEXT NOT NULL,
    color_snapshot TEXT,
    openrouter_id_snapshot TEXT NOT NULL,
    input_price_per_million_snapshot REAL NOT NULL,
    output_price_per_million_snapshot REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(benchmark_config_id, family_id)
  );

  CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    cohort_id TEXT NOT NULL,
    model_id TEXT NOT NULL,
    family_id TEXT NOT NULL,
    release_id TEXT NOT NULL,
    benchmark_config_model_id TEXT NOT NULL,
    cash_balance REAL NOT NULL DEFAULT 10000.00,
    total_invested REAL NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cohort_id, benchmark_config_model_id)
  );

  CREATE TABLE markets (
    id TEXT PRIMARY KEY,
    polymarket_id TEXT NOT NULL UNIQUE,
    slug TEXT,
    event_slug TEXT,
    question TEXT NOT NULL,
    description TEXT,
    category TEXT,
    market_type TEXT NOT NULL DEFAULT 'binary',
    outcomes TEXT,
    close_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    current_price REAL,
    current_prices TEXT,
    volume REAL,
    liquidity REAL,
    resolution_outcome TEXT,
    resolved_at TEXT,
    first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE positions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    side TEXT NOT NULL,
    shares REAL NOT NULL,
    avg_entry_price REAL NOT NULL,
    total_cost REAL NOT NULL,
    current_value REAL,
    unrealized_pnl REAL,
    status TEXT NOT NULL DEFAULT 'open',
    opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
    closed_at TEXT,
    UNIQUE(agent_id, market_id, side)
  );

  CREATE TABLE decisions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    cohort_id TEXT NOT NULL,
    decision_week INTEGER NOT NULL,
    decision_timestamp TEXT NOT NULL,
    prompt_system TEXT NOT NULL,
    prompt_user TEXT NOT NULL,
    raw_response TEXT,
    parsed_response TEXT,
    retry_count INTEGER DEFAULT 0,
    action TEXT NOT NULL,
    reasoning TEXT,
    tokens_input INTEGER,
    tokens_output INTEGER,
    api_cost_usd REAL,
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE trades (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    position_id TEXT,
    decision_id TEXT,
    trade_type TEXT NOT NULL,
    side TEXT NOT NULL,
    shares REAL NOT NULL,
    price REAL NOT NULL,
    total_amount REAL NOT NULL,
    implied_confidence REAL,
    cost_basis REAL,
    realized_pnl REAL,
    executed_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE portfolio_snapshots (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    snapshot_timestamp TEXT NOT NULL,
    cash_balance REAL NOT NULL,
    positions_value REAL NOT NULL,
    total_value REAL NOT NULL,
    total_pnl REAL NOT NULL,
    total_pnl_percent REAL NOT NULL,
    brier_score REAL,
    num_resolved_bets INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, snapshot_timestamp)
  );

  CREATE TABLE brier_scores (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    trade_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    forecast_probability REAL NOT NULL,
    actual_outcome REAL NOT NULL,
    brier_score REAL NOT NULL,
    calculated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE system_logs (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_data TEXT,
    severity TEXT DEFAULT 'info',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `);
}
