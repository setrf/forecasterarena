import type Database from 'better-sqlite3';

import type { DbMigration } from '@/lib/db/migrations/types';

export const snapshotChartIndexesMigration: DbMigration = {
  id: '010_snapshot_chart_indexes',
  description: 'Adds covering indexes for timestamp-first portfolio chart queries.',
  apply(db: Database.Database) {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp_agent_value
      ON portfolio_snapshots(snapshot_timestamp DESC, agent_id, total_value)
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_agents_cohort_family
      ON agents(cohort_id, family_id)
    `);
  }
};
