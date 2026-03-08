import type Database from 'better-sqlite3';

import { runMigrations } from '@/lib/db/migrations';
import { INDEXES_SQL } from '@/lib/db/schema/indexes';
import { TABLES_SQL } from '@/lib/db/schema/tables';
import { SEED_METHODOLOGY_SQL, SEED_MODELS_SQL } from '@/lib/db/schema';
import { initializeViews } from '@/lib/db/views';

function decisionsHaveLegacyWeekDuplicates(database: Database.Database): boolean {
  const row = database.prepare(`
    SELECT 1
    FROM decisions
    GROUP BY agent_id, cohort_id, decision_week
    HAVING COUNT(*) > 1
    LIMIT 1
  `).get();

  return Boolean(row);
}

function initializeIndexes(database: Database.Database): void {
  database.exec(INDEXES_SQL);

  if (decisionsHaveLegacyWeekDuplicates(database)) {
    console.warn(
      '[DB] Skipping unique decisions(agent_id, cohort_id, decision_week) index because legacy data contains duplicates; creating compatibility index instead.'
    );
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_decisions_agent_cohort_week
      ON decisions(agent_id, cohort_id, decision_week)
    `);
    return;
  }

  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_decisions_agent_cohort_week_unique
    ON decisions(agent_id, cohort_id, decision_week)
  `);
}

export function initializeSchema(database: Database.Database): void {
  console.log('[DB] Initializing database schema...');

  database.exec(TABLES_SQL);
  database.exec(SEED_METHODOLOGY_SQL);
  database.exec(SEED_MODELS_SQL);
  runMigrations(database);
  initializeIndexes(database);
  initializeViews(database);

  console.log('[DB] Database schema initialized');
}
