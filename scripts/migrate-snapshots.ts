import { migrateSnapshotsToTimestamps } from '../lib/db/migrations/001_snapshot_timestamps';

console.log('Starting portfolio_snapshots migration...\n');

try {
  migrateSnapshotsToTimestamps();
  console.log('\n✅ Migration completed successfully');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
}
