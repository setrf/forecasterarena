import { INITIAL_BALANCE } from '@/lib/constants';
import { getDb } from '@/lib/db';

type Db = ReturnType<typeof getDb>;

export function getAgentOpenPositionCount(db: Db, agentId: string): number {
  return (db.prepare(`
    SELECT COUNT(*) as count
    FROM positions p
    JOIN markets m ON p.market_id = m.id
    WHERE p.agent_id = ?
      AND p.status = 'open'
      AND m.status = 'active'
  `).get(agentId) as { count: number }).count;
}

export function getAgentTradeCount(db: Db, agentId: string): number {
  return (db.prepare(`
    SELECT COUNT(*) as count
    FROM trades
    WHERE agent_id = ?
  `).get(agentId) as { count: number }).count;
}

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

export function getAgentRank(
  db: Db,
  cohortId: string,
  totalValue: number
): { rank: number; total_agents: number } {
  return db.prepare(`
    SELECT
      COUNT(*) + 1 as rank,
      (SELECT COUNT(*) FROM agents WHERE cohort_id = ?) as total_agents
    FROM agents a1
    LEFT JOIN portfolio_snapshots ps1 ON a1.id = ps1.agent_id AND ps1.snapshot_timestamp = (
      SELECT MAX(snapshot_timestamp) FROM portfolio_snapshots WHERE agent_id = a1.id
    )
    LEFT JOIN (
      SELECT agent_id, COALESCE(SUM(COALESCE(current_value, total_cost)), 0) as total_position_value
      FROM positions
      WHERE status = 'open'
      GROUP BY agent_id
    ) p1 ON a1.id = p1.agent_id
    WHERE a1.cohort_id = ?
      AND COALESCE(ps1.total_value, a1.cash_balance + COALESCE(p1.total_position_value, 0)) > ?
  `).get(cohortId, cohortId, totalValue) as { rank: number; total_agents: number };
}

export function getAgentWinRate(
  db: Db,
  agentId: string
): { wins: number; total: number } | undefined {
  return db.prepare(`
    SELECT
      COUNT(CASE WHEN t.side = m.resolution_outcome THEN 1 END) as wins,
      COUNT(*) as total
    FROM trades t
    JOIN markets m ON t.market_id = m.id
    WHERE t.agent_id = ?
      AND m.status = 'resolved'
      AND t.trade_type = 'BUY'
  `).get(agentId) as { wins: number; total: number } | undefined;
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

export function getAgentDecisionsWithMarkets(db: Db, agentId: string) {
  const rawDecisions = db.prepare(`
    SELECT
      d.id,
      d.decision_week,
      d.decision_timestamp,
      d.action,
      d.reasoning
    FROM decisions d
    WHERE d.agent_id = ?
    ORDER BY d.decision_timestamp DESC
    LIMIT 20
  `).all(agentId) as Array<{
    id: string;
    decision_week: number;
    decision_timestamp: string;
    action: string;
    reasoning: string | null;
  }>;

  return rawDecisions.map((decision) => ({
    ...decision,
    markets: db.prepare(`
      SELECT
        t.trade_type,
        t.side,
        t.shares,
        t.price,
        t.total_amount,
        m.id as market_id,
        m.question as market_question
      FROM trades t
      JOIN markets m ON t.market_id = m.id
      WHERE t.decision_id = ?
      ORDER BY t.executed_at ASC
    `).all(decision.id)
  }));
}

export function getAgentTrades(db: Db, agentId: string): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT
      t.id,
      t.executed_at as timestamp,
      t.trade_type,
      t.side,
      t.shares,
      t.price,
      t.total_amount,
      t.decision_id,
      m.id as market_id,
      m.question as market_question,
      d.decision_week
    FROM trades t
    JOIN markets m ON t.market_id = m.id
    LEFT JOIN decisions d ON t.decision_id = d.id
    WHERE t.agent_id = ?
    ORDER BY t.executed_at DESC
    LIMIT 50
  `).all(agentId) as Array<Record<string, unknown>>;
}
