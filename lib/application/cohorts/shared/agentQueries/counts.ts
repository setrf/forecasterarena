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
