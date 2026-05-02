import { generateId } from '@/lib/db/ids';
import { getDb } from '@/lib/db/connection';
import {
  getPosition,
  getPositionById
} from '@/lib/db/queries/positions/read';
import type { Position } from '@/lib/types';

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
    const existingCurrentValue = existing.current_value ?? existing.total_cost;
    const newCurrentValue = existingCurrentValue + cost;

    if (newShares <= 0) {
      throw new Error(`Cannot calculate avg price: newShares is ${newShares}`);
    }

    db.prepare(`
      UPDATE positions
      SET shares = ?, avg_entry_price = ?, total_cost = ?, current_value = ?, unrealized_pnl = ?
      WHERE id = ?
    `).run(
      newShares,
      newCost / newShares,
      newCost,
      newCurrentValue,
      newCurrentValue - newCost,
      existing.id
    );

    return getPositionById(existing.id)!;
  }

  const id = generateId();

  db.prepare(`
    INSERT INTO positions (
      id, agent_id, market_id, side, shares, avg_entry_price, total_cost, current_value, unrealized_pnl, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'open')
  `).run(id, agentId, marketId, side, shares, price, cost, cost);

  return getPositionById(id)!;
}

export function reducePosition(id: string, sharesToSell: number, executionPrice?: number): void {
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
  const currentValue = position.current_value ?? position.total_cost;
  const newCurrentValue = typeof executionPrice === 'number'
    ? newShares * executionPrice
    : currentValue - ((sharesToSell / position.shares) * currentValue);

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
    SET shares = ?, total_cost = ?, current_value = ?, unrealized_pnl = ?
    WHERE id = ?
  `).run(newShares, newCost, newCurrentValue, newCurrentValue - newCost, id);
}

export function settlePosition(id: string): void {
  const db = getDb();

  db.prepare(`
    UPDATE positions
    SET current_value = 0, unrealized_pnl = 0, status = 'settled', closed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);
}

export function updatePositionMTM(id: string, currentValue: number, unrealizedPnl: number): void {
  const db = getDb();

  db.prepare(`
    UPDATE positions
    SET current_value = ?, unrealized_pnl = ?
    WHERE id = ?
  `).run(currentValue, unrealizedPnl, id);
}
