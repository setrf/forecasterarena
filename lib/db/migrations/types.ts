import type Database from 'better-sqlite3';

export interface DbMigration {
  id: string;
  description: string;
  transactional?: boolean;
  apply: (db: Database.Database) => void;
}
