import Database from 'better-sqlite3';

import { initializeSchema } from '@/lib/db/initialize';
import { DB_PATH } from '@/lib/db/runtime';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  console.log('[DB] Connecting to database:', DB_PATH);

  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  initializeSchema(db);

  console.log('[DB] Database connection established');

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] Database connection closed');
  }
}
