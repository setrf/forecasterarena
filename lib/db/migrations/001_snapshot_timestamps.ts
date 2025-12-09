import { getDb } from '../index';

export function migrateSnapshotsToTimestamps(): void {
  const db = getDb();

  db.transaction(() => {
    console.log('Starting portfolio_snapshots migration...');

    // Step 1: Create new table with timestamp support
    db.prepare(`
      CREATE TABLE IF NOT EXISTS portfolio_snapshots_new (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        snapshot_timestamp TEXT NOT NULL,
        cash_balance REAL NOT NULL,
        positions_value REAL NOT NULL,
        total_value REAL NOT NULL,
        total_pnl REAL NOT NULL,
        total_pnl_percent REAL NOT NULL,
        brier_score REAL,
        num_resolved_bets INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        UNIQUE(agent_id, snapshot_timestamp)
      )
    `).run();

    // Step 2: Backfill using created_at (has time component)
    const insertResult = db.prepare(`
      INSERT INTO portfolio_snapshots_new (
        id, agent_id, snapshot_timestamp, cash_balance, positions_value,
        total_value, total_pnl, total_pnl_percent, brier_score,
        num_resolved_bets, created_at
      )
      SELECT
        id, agent_id,
        created_at,
        cash_balance, positions_value, total_value, total_pnl,
        total_pnl_percent, brier_score, num_resolved_bets, created_at
      FROM portfolio_snapshots
    `).run();

    console.log(`Copied ${insertResult.changes} rows to new table`);

    // Step 3: Verify row counts match
    const oldCount = db.prepare('SELECT COUNT(*) as count FROM portfolio_snapshots').get() as { count: number };
    const newCount = db.prepare('SELECT COUNT(*) as count FROM portfolio_snapshots_new').get() as { count: number };

    if (oldCount.count !== newCount.count) {
      throw new Error(`Migration row count mismatch: old=${oldCount.count}, new=${newCount.count}`);
    }

    console.log(`✅ Row count verified: ${newCount.count} snapshots`);

    // Step 4: Drop old table (this also drops its indexes)
    db.prepare('DROP TABLE portfolio_snapshots').run();

    console.log('✅ Old table dropped');

    // Step 5: Rename new table to original name
    db.prepare('ALTER TABLE portfolio_snapshots_new RENAME TO portfolio_snapshots').run();

    // Step 6: Create indexes on renamed table
    db.prepare('CREATE INDEX idx_snapshots_agent ON portfolio_snapshots(agent_id)').run();
    db.prepare('CREATE INDEX idx_snapshots_timestamp ON portfolio_snapshots(snapshot_timestamp DESC)').run();
    db.prepare('CREATE INDEX idx_snapshots_agent_timestamp ON portfolio_snapshots(agent_id, snapshot_timestamp DESC)').run();

    console.log('✅ Indexes created');

    console.log(`✅ Migrated ${newCount.count} snapshots to timestamp format`);
  })();
}
