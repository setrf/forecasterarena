import type Database from 'better-sqlite3';

import type { DbMigration } from '@/lib/db/migrations/types';

function positionsUseLegacyUnique(db: Database.Database): boolean {
  const row = db.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table'
      AND name = 'positions'
  `).get() as { sql: string | null } | undefined;

  return Boolean(row?.sql?.includes('UNIQUE(agent_id, market_id, side)'));
}

function rebuildPositionsWithoutLegacyUnique(db: Database.Database): void {
  db.exec('DROP TABLE IF EXISTS positions_new;');
  db.exec(`
    CREATE TABLE positions_new (
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
      FOREIGN KEY (market_id) REFERENCES markets(id)
    )
  `);
  db.exec(`
    INSERT INTO positions_new (
      id, agent_id, market_id, side, shares, avg_entry_price, total_cost,
      current_value, unrealized_pnl, status, opened_at, closed_at
    )
    SELECT
      id, agent_id, market_id, side, shares, avg_entry_price, total_cost,
      current_value, unrealized_pnl, status, opened_at, closed_at
    FROM positions
  `);
  db.exec('DROP TABLE positions;');
  db.exec('ALTER TABLE positions_new RENAME TO positions;');
}

function assertForeignKeyIntegrity(db: Database.Database): void {
  const violations = db.pragma('foreign_key_check') as unknown[];
  if (violations.length > 0) {
    throw new Error(`foreign_key_check failed after integrity guard migration: ${JSON.stringify(violations)}`);
  }
}

function createIntegrityGuards(db: Database.Database): void {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_open_agent_market_side
      ON positions(agent_id, market_id, side)
      WHERE status = 'open';

    DROP TRIGGER IF EXISTS decisions_agent_cohort_guard_insert;
    DROP TRIGGER IF EXISTS decisions_agent_cohort_guard_update;
    DROP TRIGGER IF EXISTS trades_relationship_guard_insert;
    DROP TRIGGER IF EXISTS trades_relationship_guard_update;
    DROP TRIGGER IF EXISTS benchmark_config_models_release_family_guard_insert;
    DROP TRIGGER IF EXISTS benchmark_config_models_release_family_guard_update;

    CREATE TRIGGER decisions_agent_cohort_guard_insert
    BEFORE INSERT ON decisions
    FOR EACH ROW
    WHEN NOT EXISTS (
      SELECT 1 FROM agents a WHERE a.id = NEW.agent_id AND a.cohort_id = NEW.cohort_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'decision agent/cohort mismatch');
    END;

    CREATE TRIGGER decisions_agent_cohort_guard_update
    BEFORE UPDATE OF agent_id, cohort_id ON decisions
    FOR EACH ROW
    WHEN NOT EXISTS (
      SELECT 1 FROM agents a WHERE a.id = NEW.agent_id AND a.cohort_id = NEW.cohort_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'decision agent/cohort mismatch');
    END;

    CREATE TRIGGER trades_relationship_guard_insert
    BEFORE INSERT ON trades
    FOR EACH ROW
    WHEN
      (NEW.position_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM positions p
        WHERE p.id = NEW.position_id
          AND p.agent_id = NEW.agent_id
          AND p.market_id = NEW.market_id
          AND p.side = NEW.side
      ))
      OR
      (NEW.decision_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM decisions d
        WHERE d.id = NEW.decision_id
          AND d.agent_id = NEW.agent_id
      ))
      OR
      (NEW.release_id IS NOT NULL AND NEW.family_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM model_releases mr
        WHERE mr.id = NEW.release_id
          AND mr.family_id = NEW.family_id
      ))
    BEGIN
      SELECT RAISE(ABORT, 'trade relationship mismatch');
    END;

    CREATE TRIGGER trades_relationship_guard_update
    BEFORE UPDATE OF agent_id, market_id, position_id, decision_id, side, family_id, release_id ON trades
    FOR EACH ROW
    WHEN
      (NEW.position_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM positions p
        WHERE p.id = NEW.position_id
          AND p.agent_id = NEW.agent_id
          AND p.market_id = NEW.market_id
          AND p.side = NEW.side
      ))
      OR
      (NEW.decision_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM decisions d
        WHERE d.id = NEW.decision_id
          AND d.agent_id = NEW.agent_id
      ))
      OR
      (NEW.release_id IS NOT NULL AND NEW.family_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM model_releases mr
        WHERE mr.id = NEW.release_id
          AND mr.family_id = NEW.family_id
      ))
    BEGIN
      SELECT RAISE(ABORT, 'trade relationship mismatch');
    END;

    CREATE TRIGGER benchmark_config_models_release_family_guard_insert
    BEFORE INSERT ON benchmark_config_models
    FOR EACH ROW
    WHEN NOT EXISTS (
      SELECT 1
      FROM model_releases mr
      WHERE mr.id = NEW.release_id
        AND mr.family_id = NEW.family_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'benchmark config release/family mismatch');
    END;

    CREATE TRIGGER benchmark_config_models_release_family_guard_update
    BEFORE UPDATE OF family_id, release_id ON benchmark_config_models
    FOR EACH ROW
    WHEN NOT EXISTS (
      SELECT 1
      FROM model_releases mr
      WHERE mr.id = NEW.release_id
        AND mr.family_id = NEW.family_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'benchmark config release/family mismatch');
    END;
  `);
}

export const integrityAndPositionReopenGuardsMigration: DbMigration = {
  id: '014_integrity_and_position_reopen_guards',
  description: 'Allows reopening closed positions and adds relationship integrity guards.',
  transactional: false,
  apply(db) {
    if (positionsUseLegacyUnique(db)) {
      db.pragma('foreign_keys = OFF');
      try {
        rebuildPositionsWithoutLegacyUnique(db);
      } finally {
        db.pragma('foreign_keys = ON');
      }
      assertForeignKeyIntegrity(db);
    }
    createIntegrityGuards(db);
  }
};
