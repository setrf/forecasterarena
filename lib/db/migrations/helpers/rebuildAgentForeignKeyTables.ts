import type Database from 'better-sqlite3';

const TABLE_REBUILDS = [
  {
    name: 'positions',
    createSql: `
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
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        FOREIGN KEY (market_id) REFERENCES markets(id),
        UNIQUE(agent_id, market_id, side)
      )
    `
  },
  {
    name: 'decisions',
    createSql: `
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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        FOREIGN KEY (cohort_id) REFERENCES cohorts(id)
      )
    `
  },
  {
    name: 'trades',
    createSql: `
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
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        FOREIGN KEY (market_id) REFERENCES markets(id),
        FOREIGN KEY (position_id) REFERENCES positions(id),
        FOREIGN KEY (decision_id) REFERENCES decisions(id)
      )
    `
  },
  {
    name: 'portfolio_snapshots',
    createSql: `
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
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        UNIQUE(agent_id, snapshot_timestamp)
      )
    `
  },
  {
    name: 'brier_scores',
    createSql: `
      CREATE TABLE brier_scores (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        trade_id TEXT NOT NULL,
        market_id TEXT NOT NULL,
        forecast_probability REAL NOT NULL,
        actual_outcome REAL NOT NULL,
        brier_score REAL NOT NULL,
        calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        FOREIGN KEY (trade_id) REFERENCES trades(id),
        FOREIGN KEY (market_id) REFERENCES markets(id)
      )
    `
  },
  {
    name: 'api_costs',
    createSql: `
      CREATE TABLE api_costs (
        id TEXT PRIMARY KEY,
        model_id TEXT NOT NULL,
        agent_id TEXT,
        family_id TEXT,
        release_id TEXT,
        benchmark_config_model_id TEXT,
        decision_id TEXT,
        tokens_input INTEGER,
        tokens_output INTEGER,
        cost_usd REAL,
        recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (model_id) REFERENCES models(id),
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        FOREIGN KEY (family_id) REFERENCES model_families(id),
        FOREIGN KEY (release_id) REFERENCES model_releases(id),
        FOREIGN KEY (benchmark_config_model_id) REFERENCES benchmark_config_models(id),
        FOREIGN KEY (decision_id) REFERENCES decisions(id)
      )
    `
  }
] as const;

export function rebuildTablesReferencingAgents(db: Database.Database): void {
  for (const table of TABLE_REBUILDS) {
    db.exec(`ALTER TABLE ${table.name} RENAME TO ${table.name}_agents_fk_backup;`);
  }

  for (const table of TABLE_REBUILDS) {
    db.exec(table.createSql);
    db.exec(`
      INSERT INTO ${table.name}
      SELECT *
      FROM ${table.name}_agents_fk_backup
    `);
  }

  for (const table of TABLE_REBUILDS) {
    db.exec(`DROP TABLE ${table.name}_agents_fk_backup;`);
  }
}
