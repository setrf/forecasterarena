import type Database from 'better-sqlite3';

import type { DbMigration } from '@/lib/db/migrations/types';

function columnExists(
  db: Database.Database,
  tableName: string,
  columnName: string
): boolean {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === columnName);
}

function addColumnIfMissing(
  db: Database.Database,
  tableName: string,
  columnName: string,
  columnSql: string
): void {
  if (columnExists(db, tableName, columnName)) {
    return;
  }

  db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnSql}`).run();
}

export const decisionLineageMigration: DbMigration = {
  id: '006_decision_lineage',
  description: 'Adds frozen family/release/config lineage to decisions and backfills existing rows from agents.',
  apply(db) {
    addColumnIfMissing(db, 'decisions', 'family_id', 'family_id TEXT');
    addColumnIfMissing(db, 'decisions', 'release_id', 'release_id TEXT');
    addColumnIfMissing(db, 'decisions', 'benchmark_config_model_id', 'benchmark_config_model_id TEXT');

    db.prepare(`
      UPDATE decisions
      SET family_id = COALESCE(
            family_id,
            (SELECT a.family_id FROM agents a WHERE a.id = decisions.agent_id)
          ),
          release_id = COALESCE(
            release_id,
            (SELECT a.release_id FROM agents a WHERE a.id = decisions.agent_id)
          ),
          benchmark_config_model_id = COALESCE(
            benchmark_config_model_id,
            (SELECT a.benchmark_config_model_id FROM agents a WHERE a.id = decisions.agent_id)
          )
    `).run();
  }
};
