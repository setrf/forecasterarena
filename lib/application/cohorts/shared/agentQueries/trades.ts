import type { Db } from '@/lib/application/cohorts/shared/types';

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
