import type { Db } from '@/lib/application/cohorts/shared/types';

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
