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
      d.id,
      d.agent_id,
      d.cohort_id,
      d.decision_week,
      d.decision_timestamp,
      d.action,
      d.reasoning,
      COALESCE(dbi.family_display_name, dbi.release_display_name, a.model_id) as model_display_name,
      COALESCE(dbi.color, '#94A3B8') as model_color,
      COALESCE(dbi.family_slug, dbi.family_id, dbi.legacy_model_id, a.model_id) as family_slug,
      dbi.legacy_model_id as legacy_model_id,
      dbi.family_id,
      dbi.release_id,
      dbi.release_display_name as model_release_name
    FROM decisions d
    JOIN agents a ON d.agent_id = a.id
    LEFT JOIN decision_benchmark_identity_v dbi ON dbi.decision_id = d.id
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
  cohortId: string,
  options: { useSnapshots?: boolean } = {}
): { avg_pnl_percent: number; best_pnl_percent: number; worst_pnl_percent: number } | undefined {
  if (options.useSnapshots === false) {
    return db.prepare(`
      WITH cohort_agents AS (
        SELECT id, cash_balance
        FROM agents
        WHERE cohort_id = ?
      ),
      open_position_values AS (
        SELECT
          p.agent_id,
          COALESCE(SUM(COALESCE(p.current_value, p.total_cost)), 0) as total_position_value
        FROM positions p
        JOIN cohort_agents ca ON ca.id = p.agent_id
        WHERE p.status = 'open'
        GROUP BY p.agent_id
      ),
      current_agent_totals AS (
        SELECT
          ca.id as agent_id,
          ((ca.cash_balance + COALESCE(op.total_position_value, 0) - ?) / ?) * 100 as total_pnl_percent
        FROM cohort_agents ca
        LEFT JOIN open_position_values op ON ca.id = op.agent_id
      )
      SELECT
        AVG(total_pnl_percent) as avg_pnl_percent,
        MAX(total_pnl_percent) as best_pnl_percent,
        MIN(total_pnl_percent) as worst_pnl_percent
      FROM current_agent_totals
    `).get(cohortId, INITIAL_BALANCE, INITIAL_BALANCE) as {
      avg_pnl_percent: number;
      best_pnl_percent: number;
      worst_pnl_percent: number;
    } | undefined;
  }

  return db.prepare(`
    WITH cohort_agents AS (
      SELECT id, cash_balance
      FROM agents
      WHERE cohort_id = ?
    ),
    latest_snapshots AS (
      SELECT
        ps.agent_id,
        ps.total_pnl_percent,
        ROW_NUMBER() OVER (PARTITION BY ps.agent_id ORDER BY ps.snapshot_timestamp DESC) as rn
      FROM portfolio_snapshots ps
      JOIN cohort_agents ca ON ca.id = ps.agent_id
    ),
    open_position_values AS (
      SELECT
        p.agent_id,
        COALESCE(SUM(COALESCE(p.current_value, p.total_cost)), 0) as total_position_value
      FROM positions p
      JOIN cohort_agents ca ON ca.id = p.agent_id
      WHERE p.status = 'open'
      GROUP BY p.agent_id
    ),
    current_agent_totals AS (
      SELECT
        ca.id as agent_id,
        COALESCE(
          ls.total_pnl_percent,
          ((ca.cash_balance + COALESCE(op.total_position_value, 0) - ?) / ?) * 100
        ) as total_pnl_percent
      FROM cohort_agents ca
      LEFT JOIN latest_snapshots ls ON ca.id = ls.agent_id AND ls.rn = 1
      LEFT JOIN open_position_values op ON ca.id = op.agent_id
    )
    SELECT
      AVG(total_pnl_percent) as avg_pnl_percent,
      MAX(total_pnl_percent) as best_pnl_percent,
      MIN(total_pnl_percent) as worst_pnl_percent
    FROM current_agent_totals
  `).get(cohortId, INITIAL_BALANCE, INITIAL_BALANCE) as {
    avg_pnl_percent: number;
    best_pnl_percent: number;
    worst_pnl_percent: number;
  } | undefined;
}
