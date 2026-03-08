import type Database from 'better-sqlite3';

export interface DbMigration {
  id: string;
  description: string;
  apply: (db: Database.Database) => void;
}
