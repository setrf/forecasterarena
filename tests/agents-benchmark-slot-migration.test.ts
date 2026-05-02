import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { agentsBenchmarkSlotIdentityMigration } from '@/lib/db/migrations/005_agents_benchmark_slot_identity';
import { integrityAndPositionReopenGuardsMigration } from '@/lib/db/migrations/014_integrity_and_position_reopen_guards';
import { runMigrations } from '@/lib/db/migrations';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { force: true, recursive: true });
  }
});

async function createLegacyDb() {
  const { default: Database } = await import('better-sqlite3');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-migration-'));
  tempDirs.push(dir);
  const db = new Database(path.join(dir, 'test.db'));

  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE models (id TEXT PRIMARY KEY);
    CREATE TABLE model_families (id TEXT PRIMARY KEY);
    CREATE TABLE model_releases (id TEXT PRIMARY KEY);
    CREATE TABLE benchmark_configs (id TEXT PRIMARY KEY);
    CREATE TABLE benchmark_config_models (id TEXT PRIMARY KEY);
    CREATE TABLE cohorts (id TEXT PRIMARY KEY, benchmark_config_id TEXT NOT NULL, FOREIGN KEY (benchmark_config_id) REFERENCES benchmark_configs(id));
    CREATE TABLE markets (id TEXT PRIMARY KEY);

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
      FOREIGN KEY (cohort_id) REFERENCES cohorts(id),
      FOREIGN KEY (model_id) REFERENCES models(id),
      FOREIGN KEY (family_id) REFERENCES model_families(id),
      FOREIGN KEY (release_id) REFERENCES model_releases(id),
      FOREIGN KEY (benchmark_config_model_id) REFERENCES benchmark_config_models(id),
      UNIQUE(cohort_id, model_id)
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
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (market_id) REFERENCES markets(id),
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (cohort_id) REFERENCES cohorts(id)
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
      executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (market_id) REFERENCES markets(id),
      FOREIGN KEY (position_id) REFERENCES positions(id),
      FOREIGN KEY (decision_id) REFERENCES decisions(id)
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
      FOREIGN KEY (agent_id) REFERENCES agents(id),
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
      calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (trade_id) REFERENCES trades(id),
      FOREIGN KEY (market_id) REFERENCES markets(id)
    );

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
    );
  `);

  db.exec(`
    INSERT INTO models (id) VALUES ('legacy-model');
    INSERT INTO model_families (id) VALUES ('family-1');
    INSERT INTO model_releases (id) VALUES ('release-1');
    INSERT INTO benchmark_configs (id) VALUES ('config-1');
    INSERT INTO benchmark_config_models (id) VALUES ('slot-1');
    INSERT INTO cohorts (id, benchmark_config_id) VALUES ('cohort-1', 'config-1');
    INSERT INTO markets (id) VALUES ('market-1');
    INSERT INTO agents (id, cohort_id, model_id, family_id, release_id, benchmark_config_model_id, cash_balance, total_invested, status, created_at)
    VALUES ('agent-1', 'cohort-1', 'legacy-model', 'family-1', 'release-1', 'slot-1', 9995, 5, 'active', '2026-01-01T00:00:00.000Z');
    INSERT INTO positions (id, agent_id, market_id, side, shares, avg_entry_price, total_cost, current_value, unrealized_pnl, status, opened_at)
    VALUES ('position-1', 'agent-1', 'market-1', 'YES', 10, 0.5, 5, 5.5, 0.5, 'open', '2026-01-01T00:00:00.000Z');
    INSERT INTO decisions (id, agent_id, cohort_id, decision_week, decision_timestamp, prompt_system, prompt_user, action, created_at)
    VALUES ('decision-1', 'agent-1', 'cohort-1', 1, '2026-01-01T00:00:00.000Z', 'system', 'user', 'BET', '2026-01-01T00:00:00.000Z');
    INSERT INTO trades (id, agent_id, market_id, position_id, decision_id, trade_type, side, shares, price, total_amount, executed_at)
    VALUES ('trade-1', 'agent-1', 'market-1', 'position-1', 'decision-1', 'BUY', 'YES', 10, 0.5, 5, '2026-01-01T00:00:00.000Z');
    INSERT INTO portfolio_snapshots (id, agent_id, snapshot_timestamp, cash_balance, positions_value, total_value, total_pnl, total_pnl_percent, brier_score, num_resolved_bets, created_at)
    VALUES ('snapshot-1', 'agent-1', '2026-01-01T00:00:00.000Z', 9995, 5.5, 10000.5, 0.5, 0.005, NULL, 0, '2026-01-01T00:00:00.000Z');
    INSERT INTO brier_scores (id, agent_id, trade_id, market_id, forecast_probability, actual_outcome, brier_score, calculated_at)
    VALUES ('brier-1', 'agent-1', 'trade-1', 'market-1', 0.5, 1, 0.25, '2026-01-02T00:00:00.000Z');
    INSERT INTO api_costs (id, model_id, agent_id, family_id, release_id, benchmark_config_model_id, decision_id, tokens_input, tokens_output, cost_usd, recorded_at)
    VALUES ('cost-1', 'legacy-model', 'agent-1', 'family-1', 'release-1', 'slot-1', 'decision-1', 100, 50, 0.1, '2026-01-01T00:00:00.000Z');
  `);

  return db;
}

describe('agents benchmark slot identity migration', () => {
  it('rebuilds agent-dependent foreign keys while switching the canonical uniqueness key', async () => {
    const db = await createLegacyDb();

    try {
      agentsBenchmarkSlotIdentityMigration.apply(db);

      const agentSql = db.prepare(`
        SELECT sql
        FROM sqlite_master
        WHERE type = 'table' AND name = 'agents'
      `).get() as { sql: string };

      expect(agentSql.sql).toContain('UNIQUE(cohort_id, benchmark_config_model_id)');
      expect(agentSql.sql).not.toContain('UNIQUE(cohort_id, model_id)');
      expect(db.pragma('foreign_key_check')).toEqual([]);
      expect(db.prepare(`SELECT COUNT(*) AS count FROM agents`).get()).toEqual({ count: 1 });
      expect(db.prepare(`SELECT COUNT(*) AS count FROM positions`).get()).toEqual({ count: 1 });
      expect(db.prepare(`SELECT COUNT(*) AS count FROM decisions`).get()).toEqual({ count: 1 });
      expect(db.prepare(`SELECT COUNT(*) AS count FROM trades`).get()).toEqual({ count: 1 });
      expect(db.prepare(`SELECT COUNT(*) AS count FROM portfolio_snapshots`).get()).toEqual({ count: 1 });
      expect(db.prepare(`SELECT COUNT(*) AS count FROM brier_scores`).get()).toEqual({ count: 1 });
      expect(db.prepare(`SELECT COUNT(*) AS count FROM api_costs`).get()).toEqual({ count: 1 });

      const decisionSql = db.prepare(`
        SELECT sql
        FROM sqlite_master
        WHERE type = 'table' AND name = 'decisions'
      `).get() as { sql: string };

      expect(decisionSql.sql).toContain('REFERENCES agents(id)');
      expect(decisionSql.sql).not.toContain('agents_legacy_unique_backup');
      expect(() => {
        db.prepare(`
          INSERT INTO decisions (
            id, agent_id, cohort_id, decision_week, decision_timestamp, prompt_system, prompt_user, action
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run('decision-invalid', 'missing-agent', 'cohort-1', 2, '2026-01-03T00:00:00.000Z', 'system', 'user', 'HOLD');
      }).toThrow();
    } finally {
      db.close();
    }
  });

  it('runs cleanly through the shared migration runner without relying on transactional PRAGMA changes', async () => {
    const db = await createLegacyDb();

    try {
      db.exec(`
        CREATE TABLE schema_migrations (
          id TEXT PRIMARY KEY,
          description TEXT NOT NULL,
          applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO schema_migrations (id, description) VALUES
          ('002_model_identity_foundation', 'pre-applied'),
          ('003_api_cost_lineage', 'pre-applied'),
          ('004_lineage_write_guards', 'pre-applied');
      `);

      runMigrations(db);

      expect(
        db.prepare(`SELECT id FROM schema_migrations WHERE id = '005_agents_benchmark_slot_identity'`).get()
      ).toBeTruthy();
      expect(db.pragma('foreign_key_check')).toEqual([]);
    } finally {
      db.close();
    }
  });
});

describe('position reopen integrity migration', () => {
  it('rebuilds legacy position uniqueness into an open-position partial index', async () => {
    const { default: Database } = await import('better-sqlite3');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'positions-migration-'));
    tempDirs.push(dir);
    const db = new Database(path.join(dir, 'test.db'));

    try {
      db.exec(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE cohorts (id TEXT PRIMARY KEY);
        CREATE TABLE agents (id TEXT PRIMARY KEY, cohort_id TEXT NOT NULL, FOREIGN KEY (cohort_id) REFERENCES cohorts(id));
        CREATE TABLE markets (id TEXT PRIMARY KEY);
        CREATE TABLE model_releases (id TEXT PRIMARY KEY, family_id TEXT NOT NULL);
        CREATE TABLE benchmark_config_models (id TEXT PRIMARY KEY, family_id TEXT NOT NULL, release_id TEXT NOT NULL);
        CREATE TABLE decisions (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          cohort_id TEXT NOT NULL,
          decision_week INTEGER NOT NULL,
          decision_timestamp TEXT NOT NULL,
          prompt_system TEXT NOT NULL,
          prompt_user TEXT NOT NULL,
          action TEXT NOT NULL,
          FOREIGN KEY (agent_id) REFERENCES agents(id),
          FOREIGN KEY (cohort_id) REFERENCES cohorts(id)
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
          FOREIGN KEY (agent_id) REFERENCES agents(id),
          FOREIGN KEY (market_id) REFERENCES markets(id),
          UNIQUE(agent_id, market_id, side)
        );
        CREATE TABLE trades (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          market_id TEXT NOT NULL,
          position_id TEXT,
          decision_id TEXT,
          family_id TEXT,
          release_id TEXT,
          trade_type TEXT NOT NULL,
          side TEXT NOT NULL,
          shares REAL NOT NULL,
          price REAL NOT NULL,
          total_amount REAL NOT NULL,
          FOREIGN KEY (agent_id) REFERENCES agents(id),
          FOREIGN KEY (market_id) REFERENCES markets(id),
          FOREIGN KEY (position_id) REFERENCES positions(id),
          FOREIGN KEY (decision_id) REFERENCES decisions(id)
        );

        INSERT INTO cohorts (id) VALUES ('cohort-1');
        INSERT INTO agents (id, cohort_id) VALUES ('agent-1', 'cohort-1');
        INSERT INTO markets (id) VALUES ('market-1');
        INSERT INTO positions (id, agent_id, market_id, side, shares, avg_entry_price, total_cost, current_value, unrealized_pnl, status)
        VALUES ('position-closed-1', 'agent-1', 'market-1', 'YES', 0, 0.5, 0, 0, 0, 'closed');
      `);

      integrityAndPositionReopenGuardsMigration.apply(db);

      const positionSql = db.prepare(`
        SELECT sql
        FROM sqlite_master
        WHERE type = 'table' AND name = 'positions'
      `).get() as { sql: string };
      const partialIndex = db.prepare(`
        SELECT sql
        FROM sqlite_master
        WHERE type = 'index' AND name = 'idx_positions_open_agent_market_side'
      `).get() as { sql: string };

      expect(positionSql.sql).not.toContain('UNIQUE(agent_id, market_id, side)');
      expect(partialIndex.sql).toContain("WHERE status = 'open'");
      expect(db.pragma('foreign_key_check')).toEqual([]);

      db.prepare(`
        INSERT INTO positions (id, agent_id, market_id, side, shares, avg_entry_price, total_cost, current_value, unrealized_pnl, status)
        VALUES ('position-closed-2', 'agent-1', 'market-1', 'YES', 0, 0.6, 0, 0, 0, 'closed')
      `).run();
      db.prepare(`
        INSERT INTO positions (id, agent_id, market_id, side, shares, avg_entry_price, total_cost, current_value, unrealized_pnl, status)
        VALUES ('position-open-1', 'agent-1', 'market-1', 'YES', 4, 0.7, 2.8, 2.8, 0, 'open')
      `).run();
      expect(() => db.prepare(`
        INSERT INTO positions (id, agent_id, market_id, side, shares, avg_entry_price, total_cost, current_value, unrealized_pnl, status)
        VALUES ('position-open-2', 'agent-1', 'market-1', 'YES', 5, 0.8, 4, 4, 0, 'open')
      `).run()).toThrow();
    } finally {
      db.close();
    }
  });
});
