import type Database from 'better-sqlite3';

import { modelIdentityFoundationMigration } from '@/lib/db/migrations/002_model_identity_foundation';
import { apiCostLineageMigration } from '@/lib/db/migrations/003_api_cost_lineage';
import { lineageWriteGuardsMigration } from '@/lib/db/migrations/004_lineage_write_guards';
import { agentsBenchmarkSlotIdentityMigration } from '@/lib/db/migrations/005_agents_benchmark_slot_identity';
import { decisionLineageMigration } from '@/lib/db/migrations/006_decision_lineage';
import type { DbMigration } from '@/lib/db/migrations/types';

const MIGRATIONS: DbMigration[] = [
  modelIdentityFoundationMigration,
  apiCostLineageMigration,
  lineageWriteGuardsMigration,
  agentsBenchmarkSlotIdentityMigration,
  decisionLineageMigration
];

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const hasMigration = db.prepare(`
    SELECT 1
    FROM schema_migrations
    WHERE id = ?
    LIMIT 1
  `);
  const recordMigration = db.prepare(`
    INSERT INTO schema_migrations (id, description)
    VALUES (?, ?)
  `);

  for (const migration of MIGRATIONS) {
    const alreadyApplied = hasMigration.get(migration.id);
    if (alreadyApplied) {
      continue;
    }

    const applyAndRecord = () => {
      migration.apply(db);
      recordMigration.run(migration.id, migration.description);
    };

    if (migration.transactional === false) {
      applyAndRecord();
      continue;
    }

    db.transaction(applyAndRecord)();
  }
}
