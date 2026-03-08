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

export const apiCostLineageMigration: DbMigration = {
  id: '003_api_cost_lineage',
  description: 'Adds frozen agent/family/release/config lineage to api_costs and backfills from decisions.',
  apply(db) {
    addColumnIfMissing(db, 'api_costs', 'agent_id', 'agent_id TEXT');
    addColumnIfMissing(db, 'api_costs', 'family_id', 'family_id TEXT');
    addColumnIfMissing(db, 'api_costs', 'release_id', 'release_id TEXT');
    addColumnIfMissing(db, 'api_costs', 'benchmark_config_model_id', 'benchmark_config_model_id TEXT');

    db.prepare(`
      UPDATE api_costs
      SET agent_id = COALESCE(
            agent_id,
            (SELECT d.agent_id FROM decisions d WHERE d.id = api_costs.decision_id)
          ),
          family_id = COALESCE(
            family_id,
            (
              SELECT a.family_id
              FROM decisions d
              JOIN agents a ON a.id = d.agent_id
              WHERE d.id = api_costs.decision_id
            )
          ),
          release_id = COALESCE(
            release_id,
            (
              SELECT a.release_id
              FROM decisions d
              JOIN agents a ON a.id = d.agent_id
              WHERE d.id = api_costs.decision_id
            )
          ),
          benchmark_config_model_id = COALESCE(
            benchmark_config_model_id,
            (
              SELECT a.benchmark_config_model_id
              FROM decisions d
              JOIN agents a ON a.id = d.agent_id
              WHERE d.id = api_costs.decision_id
            )
          )
      WHERE decision_id IS NOT NULL
    `).run();
  }
};
