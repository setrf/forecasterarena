import { generateId, getDb } from '../index';
import type { Position, PositionWithMarket } from '../../types';

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

export function upsertPosition(
  agentId: string,
  marketId: string,
  side: string,
  shares: number,
  price: number,
  cost: number
): Position {
  const db = getDb();
  const existing = getPosition(agentId, marketId, side);

  if (existing) {
    const newShares = existing.shares + shares;
    const newCost = existing.total_cost + cost;

    if (newShares <= 0) {
      throw new Error(`Cannot calculate avg price: newShares is ${newShares}`);
    }

    db.prepare(`
      UPDATE positions
      SET shares = ?, avg_entry_price = ?, total_cost = ?
      WHERE id = ?
    `).run(newShares, newCost / newShares, newCost, existing.id);

    return getPositionById(existing.id)!;
  }

  const id = generateId();

  db.prepare(`
    INSERT INTO positions (id, agent_id, market_id, side, shares, avg_entry_price, total_cost, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
  `).run(id, agentId, marketId, side, shares, price, cost);

  return getPositionById(id)!;
}

export function reducePosition(id: string, sharesToSell: number): void {
  const db = getDb();
  const position = getPositionById(id);

  if (!position) {
    return;
  }

  if (position.shares <= 0) {
    throw new Error(`Cannot reduce position ${id}: shares is ${position.shares}`);
  }

  const newShares = position.shares - sharesToSell;
  const costReduction = (sharesToSell / position.shares) * position.total_cost;
  const newCost = position.total_cost - costReduction;

  if (newShares <= 0) {
    db.prepare(`
      UPDATE positions
      SET shares = 0, total_cost = 0, current_value = 0, unrealized_pnl = 0, status = 'closed', closed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
    return;
  }

  db.prepare(`
    UPDATE positions
    SET shares = ?, total_cost = ?
    WHERE id = ?
  `).run(newShares, newCost, id);
}

export function settlePosition(id: string): void {
  const db = getDb();

  db.prepare(`
    UPDATE positions
    SET current_value = 0, unrealized_pnl = 0, status = 'settled', closed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);
}

export function getPositionsByMarket(marketId: string): Position[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM positions
    WHERE market_id = ? AND status = 'open'
  `).all(marketId) as Position[];
}

export function updatePositionMTM(id: string, currentValue: number, unrealizedPnl: number): void {
  const db = getDb();

  db.prepare(`
    UPDATE positions
    SET current_value = ?, unrealized_pnl = ?
    WHERE id = ?
  `).run(currentValue, unrealizedPnl, id);
}
