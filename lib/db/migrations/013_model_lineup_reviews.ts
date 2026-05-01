import type Database from 'better-sqlite3';

import type { DbMigration } from '@/lib/db/migrations/types';

export const modelLineupReviewsMigration: DbMigration = {
  id: '013_model_lineup_reviews',
  description: 'Adds persisted OpenRouter model lineup review records.',
  apply(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS model_lineup_reviews (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK (status IN ('open', 'no_changes', 'approved', 'dismissed', 'failed')),
        checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TEXT,
        target_config_id TEXT,
        candidate_lineup_json TEXT NOT NULL DEFAULT '[]',
        catalog_summary_json TEXT NOT NULL DEFAULT '{}',
        error_message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (target_config_id) REFERENCES benchmark_configs(id)
      );

      CREATE INDEX IF NOT EXISTS idx_model_lineup_reviews_checked_at
        ON model_lineup_reviews(checked_at DESC);

      CREATE INDEX IF NOT EXISTS idx_model_lineup_reviews_status
        ON model_lineup_reviews(status, checked_at DESC);
    `);
  }
};
