import type Database from 'better-sqlite3';

import { SCHEMA_SQL, SEED_METHODOLOGY_SQL, SEED_MODELS_SQL } from '@/lib/db/schema';

export function initializeSchema(database: Database.Database): void {
  console.log('[DB] Initializing database schema...');

  database.exec(SCHEMA_SQL);
  database.exec(SEED_METHODOLOGY_SQL);
  database.exec(SEED_MODELS_SQL);

  console.log('[DB] Database schema initialized');
}
