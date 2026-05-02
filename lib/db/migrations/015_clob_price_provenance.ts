import type Database from 'better-sqlite3';

import type { DbMigration } from '@/lib/db/migrations/types';

function hasColumn(db: Database.Database, tableName: string, columnName: string): boolean {
  return db.prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .some((column) => (column as { name: string }).name === columnName);
}

export const clobPriceProvenanceMigration: DbMigration = {
  id: '015_clob_price_provenance',
  description: 'Store CLOB token ids and market price provenance for portfolio valuation',
  apply: (db) => {
    if (!hasColumn(db, 'markets', 'clob_token_ids')) {
      db.prepare('ALTER TABLE markets ADD COLUMN clob_token_ids TEXT').run();
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS market_price_snapshots (
        id TEXT PRIMARY KEY,
        market_id TEXT NOT NULL,
        snapshot_timestamp TEXT NOT NULL,
        source TEXT NOT NULL,
        accepted_price REAL,
        accepted_prices TEXT,
        gamma_price REAL,
        gamma_prices TEXT,
        clob_token_ids TEXT,
        validation_status TEXT NOT NULL,
        anomaly_reason TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (market_id) REFERENCES markets(id),
        UNIQUE(market_id, snapshot_timestamp)
      );

      CREATE INDEX IF NOT EXISTS idx_market_price_snapshots_market_time
        ON market_price_snapshots(market_id, snapshot_timestamp DESC);

      CREATE INDEX IF NOT EXISTS idx_market_price_snapshots_status_time
        ON market_price_snapshots(validation_status, snapshot_timestamp DESC);
    `);
  }
};
