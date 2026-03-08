import type Database from 'better-sqlite3';

import { ensureModelIdentityFoundation } from '@/lib/catalog/foundation';
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

export const modelIdentityFoundationMigration: DbMigration = {
  id: '002_model_identity_foundation',
  description: 'Adds family/release/config identity and backfills existing cohorts and agents.',
  apply(db) {
    addColumnIfMissing(db, 'cohorts', 'benchmark_config_id', 'benchmark_config_id TEXT');
    addColumnIfMissing(db, 'agents', 'family_id', 'family_id TEXT');
    addColumnIfMissing(db, 'agents', 'release_id', 'release_id TEXT');
    addColumnIfMissing(db, 'agents', 'benchmark_config_model_id', 'benchmark_config_model_id TEXT');

    ensureModelIdentityFoundation(db);
  }
};
