import type { Db } from '@/lib/application/cohorts/shared/types';

export function getCohortTradeCount(db: Db, cohortId: string): number {
  return (db.prepare(`
    SELECT COUNT(*) as count
    FROM trades t
    JOIN agents a ON t.agent_id = a.id
    WHERE a.cohort_id = ?
  `).get(cohortId) as { count: number }).count;
}

export function getCohortOpenPositionCount(db: Db, cohortId: string): number {
  return (db.prepare(`
    SELECT COUNT(*) as count
    FROM positions p
    JOIN agents a ON p.agent_id = a.id
    WHERE a.cohort_id = ? AND p.status = 'open'
  `).get(cohortId) as { count: number }).count;
}

export function getCohortMarketsWithPositionsCount(db: Db, cohortId: string): number {
  return (db.prepare(`
    SELECT COUNT(DISTINCT p.market_id) as count
    FROM positions p
    JOIN agents a ON p.agent_id = a.id
    WHERE a.cohort_id = ?
  `).get(cohortId) as { count: number }).count;
}

export function getRecentCohortDecisions(db: Db, cohortId: string): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT
      d.*,
      m.display_name as model_display_name,
      m.color as model_color
    FROM decisions d
    JOIN agents a ON d.agent_id = a.id
    JOIN models m ON a.model_id = m.id
    WHERE d.cohort_id = ?
    ORDER BY d.decision_timestamp DESC
    LIMIT 20
  `).all(cohortId) as Array<Record<string, unknown>>;
}

export function getCohortWeek(db: Db, cohortId: string): number {
  const result = db.prepare(`
    SELECT CAST((julianday('now') - julianday(started_at)) / 7 AS INTEGER) + 1 as week_number
    FROM cohorts
    WHERE id = ?
  `).get(cohortId) as { week_number: number } | undefined;

  return result?.week_number ?? 1;
}

export function getCohortMarketCount(db: Db, cohortId: string): number {
  const result = db.prepare(`
    SELECT COUNT(DISTINCT market_id) as count
    FROM positions
    WHERE agent_id IN (
      SELECT id FROM agents WHERE cohort_id = ?
    )
  `).get(cohortId) as { count: number } | undefined;

  return result?.count ?? 0;
}
