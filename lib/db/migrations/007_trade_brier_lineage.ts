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

export const tradeBrierLineageMigration: DbMigration = {
  id: '007_trade_brier_lineage',
  description: 'Adds frozen lineage to trades and brier scores and backfills existing rows.',
  apply(db) {
    addColumnIfMissing(db, 'trades', 'family_id', 'family_id TEXT');
    addColumnIfMissing(db, 'trades', 'release_id', 'release_id TEXT');
    addColumnIfMissing(db, 'trades', 'benchmark_config_model_id', 'benchmark_config_model_id TEXT');

    addColumnIfMissing(db, 'brier_scores', 'family_id', 'family_id TEXT');
    addColumnIfMissing(db, 'brier_scores', 'release_id', 'release_id TEXT');
    addColumnIfMissing(db, 'brier_scores', 'benchmark_config_model_id', 'benchmark_config_model_id TEXT');

    db.prepare(`
      UPDATE trades
      SET family_id = COALESCE(
            family_id,
            (
              SELECT COALESCE(d.family_id, a.family_id)
              FROM decisions d
              JOIN agents a ON a.id = d.agent_id
              WHERE d.id = trades.decision_id
              LIMIT 1
            ),
            (SELECT a.family_id FROM agents a WHERE a.id = trades.agent_id)
          ),
          release_id = COALESCE(
            release_id,
            (
              SELECT COALESCE(d.release_id, a.release_id)
              FROM decisions d
              JOIN agents a ON a.id = d.agent_id
              WHERE d.id = trades.decision_id
              LIMIT 1
            ),
            (SELECT a.release_id FROM agents a WHERE a.id = trades.agent_id)
          ),
          benchmark_config_model_id = COALESCE(
            benchmark_config_model_id,
            (
              SELECT COALESCE(d.benchmark_config_model_id, a.benchmark_config_model_id)
              FROM decisions d
              JOIN agents a ON a.id = d.agent_id
              WHERE d.id = trades.decision_id
              LIMIT 1
            ),
            (SELECT a.benchmark_config_model_id FROM agents a WHERE a.id = trades.agent_id)
          )
    `).run();

    db.prepare(`
      UPDATE brier_scores
      SET family_id = COALESCE(
            family_id,
            (
              SELECT COALESCE(t.family_id, a.family_id)
              FROM trades t
              JOIN agents a ON a.id = t.agent_id
              WHERE t.id = brier_scores.trade_id
              LIMIT 1
            )
          ),
          release_id = COALESCE(
            release_id,
            (
              SELECT COALESCE(t.release_id, a.release_id)
              FROM trades t
              JOIN agents a ON a.id = t.agent_id
              WHERE t.id = brier_scores.trade_id
              LIMIT 1
            )
          ),
          benchmark_config_model_id = COALESCE(
            benchmark_config_model_id,
            (
              SELECT COALESCE(t.benchmark_config_model_id, a.benchmark_config_model_id)
              FROM trades t
              JOIN agents a ON a.id = t.agent_id
              WHERE t.id = brier_scores.trade_id
              LIMIT 1
            )
          )
    `).run();
  }
};
