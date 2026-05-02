import type Database from 'better-sqlite3';

import { rebuildTablesReferencingAgents } from '@/lib/db/migrations/helpers/rebuildAgentForeignKeyTables';
import type { DbMigration } from '@/lib/db/migrations/types';

function assertForeignKeyIntegrity(db: Database.Database): void {
  const violations = db.pragma('foreign_key_check') as unknown[];
  if (violations.length > 0) {
    throw new Error(`foreign_key_check failed after agent lineage migration: ${JSON.stringify(violations)}`);
  }
}

function createAgentLineageWriteGuards(db: Database.Database): void {
  db.exec('DROP TRIGGER IF EXISTS agents_require_frozen_lineage_insert;');
  db.exec('DROP TRIGGER IF EXISTS agents_require_frozen_lineage_update;');

  db.exec(`
    CREATE TRIGGER agents_require_frozen_lineage_insert
    BEFORE INSERT ON agents
    FOR EACH ROW
    WHEN NEW.family_id IS NULL
      OR NEW.release_id IS NULL
      OR NEW.benchmark_config_model_id IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'agents frozen lineage is required');
    END;
  `);

  db.exec(`
    CREATE TRIGGER agents_require_frozen_lineage_update
    BEFORE UPDATE OF family_id, release_id, benchmark_config_model_id ON agents
    FOR EACH ROW
    WHEN NEW.family_id IS NULL
      OR NEW.release_id IS NULL
      OR NEW.benchmark_config_model_id IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'agents frozen lineage is required');
    END;
  `);
}

function schemaStillUsesLegacyUnique(db: Database.Database): boolean {
  const row = db.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table' AND name = 'agents'
  `).get() as { sql: string | null } | undefined;

  return Boolean(row?.sql?.includes('UNIQUE(cohort_id, model_id)'));
}

export const agentsBenchmarkSlotIdentityMigration: DbMigration = {
  id: '005_agents_benchmark_slot_identity',
  description: 'Rebuilds agents to use frozen benchmark slot identity as the canonical uniqueness key.',
  transactional: false,
  apply(db) {
    if (!schemaStillUsesLegacyUnique(db)) {
      createAgentLineageWriteGuards(db);
      return;
    }

    db.pragma('foreign_keys = OFF');
    db.exec('DROP TRIGGER IF EXISTS agents_require_frozen_lineage_insert;');
    db.exec('DROP TRIGGER IF EXISTS agents_require_frozen_lineage_update;');
    db.exec('ALTER TABLE agents RENAME TO agents_legacy_unique_backup;');
    db.exec(`
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
        UNIQUE(cohort_id, benchmark_config_model_id)
      )
    `);
    db.exec(`
      INSERT INTO agents (
        id,
        cohort_id,
        model_id,
        family_id,
        release_id,
        benchmark_config_model_id,
        cash_balance,
        total_invested,
        status,
        created_at
      )
      SELECT
        id,
        cohort_id,
        model_id,
        family_id,
        release_id,
        benchmark_config_model_id,
        cash_balance,
        total_invested,
        status,
        created_at
      FROM agents_legacy_unique_backup
    `);
    rebuildTablesReferencingAgents(db);
    db.exec('DROP TABLE agents_legacy_unique_backup;');
    createAgentLineageWriteGuards(db);
    db.pragma('foreign_keys = ON');
    assertForeignKeyIntegrity(db);
  }
};
