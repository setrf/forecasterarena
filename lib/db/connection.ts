import Database from 'better-sqlite3';

import { initializeSchema } from '@/lib/db/initialize';
import { DB_PATH } from '@/lib/db/runtime';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  console.log('[DB] Connecting to database:', DB_PATH);

  const database = new Database(DB_PATH);
  database.pragma('foreign_keys = ON');
  database.pragma('journal_mode = WAL');

  try {
    initializeSchema(database);
    db = database;
    console.log('[DB] Database connection established');
    return db;
  } catch (error) {
    console.error('[DB] Initialization failed:', error);
    try {
      database.close();
    } catch {
      // Ignore close failures while unwinding initialization errors.
    }
    throw error;
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] Database connection closed');
  }
}
