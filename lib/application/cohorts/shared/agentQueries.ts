import type { Db } from '@/lib/application/cohorts/shared/types';

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

export function getAgentDecisionsWithMarkets(db: Db, agentId: string) {
  const decisions = db.prepare(`
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

  return decisions.map((decision) => ({
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

export function getAgentTrades(
  db: Db,
  agentId: string
): Array<Record<string, unknown>> {
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
