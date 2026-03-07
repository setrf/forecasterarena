import { getDb } from '@/lib/db/connection';
import type { Position, PositionWithMarket } from '@/lib/types';

export function getOpenPositions(agentId: string): Position[] {
  const db = getDb();
  return db.prepare(`
    SELECT p.* FROM positions p
    JOIN markets m ON p.market_id = m.id
    WHERE p.agent_id = ?
      AND p.status = 'open'
      AND m.status = 'active'
    ORDER BY p.opened_at DESC
  `).all(agentId) as Position[];
}

export function getAllOpenPositions(agentId: string): Position[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM positions
    WHERE agent_id = ? AND status = 'open'
    ORDER BY opened_at DESC
  `).all(agentId) as Position[];
}

export function getPositionsWithMarkets(agentId: string): PositionWithMarket[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      p.*,
      m.question as market_question,
      m.current_price,
      t.decision_id as opening_decision_id
    FROM positions p
    JOIN markets m ON p.market_id = m.id
    LEFT JOIN (
      SELECT market_id, agent_id, side, decision_id, MIN(executed_at) as first_trade
      FROM trades
      WHERE trade_type = 'BUY'
      GROUP BY market_id, agent_id, side
    ) t ON p.market_id = t.market_id AND p.agent_id = t.agent_id AND p.side = t.side
    WHERE p.agent_id = ?
      AND p.status = 'open'
      AND m.status = 'active'
    ORDER BY p.opened_at DESC
  `).all(agentId) as PositionWithMarket[];
}

export function getClosedPositionsWithMarkets(agentId: string): any[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      p.id,
      p.market_id,
      p.side,
      p.shares,
      p.avg_entry_price,
      p.total_cost,
      p.status as position_status,
      p.opened_at,
      p.closed_at,
      m.question as market_question,
      m.status as market_status,
      m.resolution_outcome,
      m.resolved_at,
      CASE
        WHEN p.status = 'closed' THEN 'EXITED'
        WHEN p.status = 'settled' AND m.resolution_outcome = 'CANCELLED' THEN 'CANCELLED'
        WHEN p.status = 'settled' AND UPPER(p.side) = UPPER(m.resolution_outcome) THEN 'WON'
        WHEN p.status = 'settled' AND UPPER(p.side) != UPPER(m.resolution_outcome) THEN 'LOST'
        WHEN p.status = 'open' AND m.status = 'closed' THEN 'PENDING'
        ELSE 'UNKNOWN'
      END as outcome,
      CASE
        WHEN p.status = 'closed' THEN (
          SELECT COALESCE(SUM(total_amount), 0)
          FROM trades
          WHERE position_id = p.id AND trade_type = 'SELL'
        )
        WHEN p.status = 'settled' AND m.resolution_outcome = 'CANCELLED' THEN p.total_cost
        WHEN p.status = 'settled' AND UPPER(p.side) = UPPER(m.resolution_outcome) THEN p.shares * 1.0
        WHEN p.status = 'settled' THEN 0.0
        ELSE NULL
      END as settlement_value,
      CASE
        WHEN p.status = 'closed' THEN (
          SELECT COALESCE(SUM(total_amount), 0) - COALESCE(SUM(cost_basis), 0)
          FROM trades
          WHERE position_id = p.id AND trade_type = 'SELL'
        )
        WHEN p.status = 'settled' AND m.resolution_outcome = 'CANCELLED' THEN 0.0
        WHEN p.status = 'settled' AND UPPER(p.side) = UPPER(m.resolution_outcome) THEN (p.shares * 1.0) - p.total_cost
        WHEN p.status = 'settled' THEN 0.0 - p.total_cost
        ELSE NULL
      END as pnl,
      t.decision_id as opening_decision_id
    FROM positions p
    JOIN markets m ON p.market_id = m.id
    LEFT JOIN (
      SELECT position_id, decision_id, MIN(executed_at) as first_trade
      FROM trades
      WHERE trade_type = 'BUY'
      GROUP BY position_id
    ) t ON p.id = t.position_id
    WHERE p.agent_id = ?
      AND (
        p.status = 'settled'
        OR p.status = 'closed'
        OR (p.status = 'open' AND m.status IN ('closed', 'resolved'))
      )
    ORDER BY
      COALESCE(p.closed_at, m.resolved_at, m.close_date) DESC,
      p.opened_at DESC
    LIMIT 50
  `).all(agentId);
}

export function getPositionById(id: string): Position | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM positions WHERE id = ?').get(id) as Position | undefined;
}

export function getPosition(agentId: string, marketId: string, side: string): Position | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM positions
    WHERE agent_id = ? AND market_id = ? AND side = ? AND status = 'open'
  `).get(agentId, marketId, side) as Position | undefined;
}

export function getPositionsByMarket(marketId: string): Position[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM positions
    WHERE market_id = ? AND status = 'open'
  `).all(marketId) as Position[];
}
