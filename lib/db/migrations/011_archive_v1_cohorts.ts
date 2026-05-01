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

export const archiveV1CohortsMigration: DbMigration = {
  id: '011_archive_v1_cohorts',
  description: 'Archives v1 cohorts and invalidates aggregate performance chart cache.',
  apply(db: Database.Database) {
    addColumnIfMissing(db, 'cohorts', 'is_archived', 'is_archived INTEGER NOT NULL DEFAULT 0');
    addColumnIfMissing(db, 'cohorts', 'archived_at', 'archived_at TEXT');
    addColumnIfMissing(db, 'cohorts', 'archive_reason', 'archive_reason TEXT');

    if (columnExists(db, 'cohorts', 'methodology_version')) {
      db.prepare(`
        UPDATE cohorts
        SET is_archived = 1,
            archived_at = COALESCE(archived_at, CURRENT_TIMESTAMP),
            archive_reason = COALESCE(
              archive_reason,
              'Archived as historical v1 cohort excluded from current v2 scoring'
            )
        WHERE methodology_version = 'v1'
      `).run();

      db.prepare(`
        UPDATE cohorts
        SET is_archived = 0,
            archived_at = NULL,
            archive_reason = NULL
        WHERE methodology_version != 'v1'
      `).run();
    }

    db.prepare(`
      DELETE FROM performance_chart_cache
    `).run();

    if (columnExists(db, 'cohorts', 'status')) {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_cohorts_archived_status
        ON cohorts(is_archived, status)
      `);
    } else {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_cohorts_archived_status
        ON cohorts(is_archived)
      `);
    }
  }
};
