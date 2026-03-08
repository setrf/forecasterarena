import { INITIAL_BALANCE } from '@/lib/constants';
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

export function getRecentCohortDecisions(
  db: Db,
  cohortId: string
): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT
      d.*,
      COALESCE(abi.family_display_name, abi.release_display_name, a.model_id) as model_display_name,
      COALESCE(abi.color, '#94A3B8') as model_color,
      COALESCE(abi.legacy_model_id, abi.family_slug, abi.family_id, a.model_id) as model_id,
      abi.family_id,
      abi.release_id,
      abi.release_display_name as model_release_name
    FROM decisions d
    JOIN agents a ON d.agent_id = a.id
    LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
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

export function getCohortPnlStats(
  db: Db,
  cohortId: string
): { avg_pnl_percent: number; best_pnl_percent: number; worst_pnl_percent: number } | undefined {
  return db.prepare(`
    WITH latest_snapshots AS (
      SELECT
        ps.agent_id,
        ps.total_pnl_percent,
        ROW_NUMBER() OVER (PARTITION BY ps.agent_id ORDER BY ps.snapshot_timestamp DESC) as rn
      FROM portfolio_snapshots ps
    ),
    open_position_values AS (
      SELECT
        p.agent_id,
        COALESCE(SUM(COALESCE(p.current_value, p.total_cost)), 0) as total_position_value
      FROM positions p
      WHERE p.status = 'open'
      GROUP BY p.agent_id
    ),
    current_agent_totals AS (
      SELECT
        a.id as agent_id,
        COALESCE(
          ls.total_pnl_percent,
          ((a.cash_balance + COALESCE(op.total_position_value, 0) - ?) / ?) * 100
        ) as total_pnl_percent
      FROM agents a
      LEFT JOIN latest_snapshots ls ON a.id = ls.agent_id AND ls.rn = 1
      LEFT JOIN open_position_values op ON a.id = op.agent_id
      WHERE a.cohort_id = ?
    )
    SELECT
      AVG(total_pnl_percent) as avg_pnl_percent,
      MAX(total_pnl_percent) as best_pnl_percent,
      MIN(total_pnl_percent) as worst_pnl_percent
    FROM current_agent_totals
  `).get(INITIAL_BALANCE, INITIAL_BALANCE, cohortId) as {
    avg_pnl_percent: number;
    best_pnl_percent: number;
    worst_pnl_percent: number;
  } | undefined;
}
