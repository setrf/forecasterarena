import type Database from 'better-sqlite3';

import type { DbMigration } from '@/lib/db/migrations/types';

function assertNoNullLineage(db: Database.Database): void {
  const missingCohortConfig = db.prepare(`
    SELECT COUNT(*) as count
    FROM cohorts
    WHERE benchmark_config_id IS NULL
  `).get() as { count: number };

  if (missingCohortConfig.count > 0) {
    throw new Error('Cannot install lineage write guards while cohorts are missing benchmark_config_id');
  }

  const missingAgentLineage = db.prepare(`
    SELECT COUNT(*) as count
    FROM agents
    WHERE family_id IS NULL
       OR release_id IS NULL
       OR benchmark_config_model_id IS NULL
  `).get() as { count: number };

  if (missingAgentLineage.count > 0) {
    throw new Error('Cannot install lineage write guards while agents are missing frozen lineage');
  }
}

function createWriteGuard(
  db: Database.Database,
  name: string,
  sql: string
): void {
  db.exec(`DROP TRIGGER IF EXISTS ${name};`);
  db.exec(sql);
}

export const lineageWriteGuardsMigration: DbMigration = {
  id: '004_lineage_write_guards',
  description: 'Enforces frozen cohort and agent lineage on migrated databases through SQLite triggers.',
  apply(db) {
    assertNoNullLineage(db);

    createWriteGuard(
      db,
      'cohorts_require_benchmark_config_insert',
      `
        CREATE TRIGGER cohorts_require_benchmark_config_insert
        BEFORE INSERT ON cohorts
        FOR EACH ROW
        WHEN NEW.benchmark_config_id IS NULL
        BEGIN
          SELECT RAISE(ABORT, 'cohorts.benchmark_config_id is required');
        END;
      `
    );

    createWriteGuard(
      db,
      'cohorts_require_benchmark_config_update',
      `
        CREATE TRIGGER cohorts_require_benchmark_config_update
        BEFORE UPDATE OF benchmark_config_id ON cohorts
        FOR EACH ROW
        WHEN NEW.benchmark_config_id IS NULL
        BEGIN
          SELECT RAISE(ABORT, 'cohorts.benchmark_config_id is required');
        END;
      `
    );

    createWriteGuard(
      db,
      'agents_require_frozen_lineage_insert',
      `
        CREATE TRIGGER agents_require_frozen_lineage_insert
        BEFORE INSERT ON agents
        FOR EACH ROW
        WHEN NEW.family_id IS NULL
          OR NEW.release_id IS NULL
          OR NEW.benchmark_config_model_id IS NULL
        BEGIN
          SELECT RAISE(ABORT, 'agents frozen lineage is required');
        END;
      `
    );

    createWriteGuard(
      db,
      'agents_require_frozen_lineage_update',
      `
        CREATE TRIGGER agents_require_frozen_lineage_update
        BEFORE UPDATE OF family_id, release_id, benchmark_config_model_id ON agents
        FOR EACH ROW
        WHEN NEW.family_id IS NULL
          OR NEW.release_id IS NULL
          OR NEW.benchmark_config_model_id IS NULL
        BEGIN
          SELECT RAISE(ABORT, 'agents frozen lineage is required');
        END;
      `
    );
  }
};
