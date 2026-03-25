import type Database from 'better-sqlite3';

import type { DbMigration } from '@/lib/db/migrations/types';

export const brierTradeUniquenessMigration: DbMigration = {
  id: '009_brier_trade_uniqueness',
  description: 'Deduplicates brier scores by trade and enforces a unique trade_id index.',
  apply(db: Database.Database) {
    db.exec(`
      DELETE FROM brier_scores
      WHERE rowid NOT IN (
        SELECT MIN(rowid)
        FROM brier_scores
        GROUP BY trade_id
      )
    `);
    db.exec(`
      DROP INDEX IF EXISTS idx_brier_trade
    `);
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_brier_trade
      ON brier_scores(trade_id)
    `);
  }
};
