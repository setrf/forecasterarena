import { getDb } from '@/lib/db/connection';

const TABLES = [
  'cohorts',
  'models',
  'agents',
  'markets',
  'positions',
  'trades',
  'decisions',
  'portfolio_snapshots',
  'brier_scores',
  'api_costs',
  'system_logs'
] as const;

const VALID_TABLES = [
  'cohorts',
  'models',
  'agents',
  'markets',
  'positions',
  'trades',
  'decisions',
  'portfolio_snapshots',
  'brier_scores',
  'system_logs',
  'api_costs'
] as const;

export function getDbStats(): Record<string, number> {
  const database = getDb();
  const stats: Record<string, number> = {};

  for (const table of TABLES) {
    if (!VALID_TABLES.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    const result = database.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
    stats[table] = result.count;
  }

  return stats;
}
