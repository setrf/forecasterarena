import type Database from 'better-sqlite3';

import { runMigrations } from '@/lib/db/migrations';
import { INDEXES_SQL } from '@/lib/db/schema/indexes';
import { TABLES_SQL } from '@/lib/db/schema/tables';
import { SEED_METHODOLOGY_SQL, SEED_MODELS_SQL } from '@/lib/db/schema';
import { initializeViews } from '@/lib/db/views';

export function initializeSchema(database: Database.Database): void {
  console.log('[DB] Initializing database schema...');

  database.exec(TABLES_SQL);
  database.exec(SEED_METHODOLOGY_SQL);
  database.exec(SEED_MODELS_SQL);
  runMigrations(database);
  database.exec(INDEXES_SQL);
  initializeViews(database);

  console.log('[DB] Database schema initialized');
}
