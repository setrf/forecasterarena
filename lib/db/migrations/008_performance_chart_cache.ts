import type Database from 'better-sqlite3';

import type { DbMigration } from '@/lib/db/migrations/types';

export const performanceChartCacheMigration: DbMigration = {
  id: '008_performance_chart_cache',
  description: 'Adds persisted performance chart cache entries refreshed by the snapshot cron.',
  apply(db: Database.Database) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS performance_chart_cache (
        cache_key TEXT PRIMARY KEY,
        cohort_id TEXT,
        range_key TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cohort_id) REFERENCES cohorts(id)
      )
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_performance_chart_cache_range
      ON performance_chart_cache(range_key)
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_performance_chart_cache_cohort
      ON performance_chart_cache(cohort_id)
    `);
  }
};
