import { generateId, getDb } from '../index';
import type { Trade } from '../../types';

export function createTrade(trade: {
  agent_id: string;
  market_id: string;
  position_id?: string;
  decision_id?: string;
  trade_type: 'BUY' | 'SELL';
  side: string;
  shares: number;
  price: number;
  total_amount: number;
  implied_confidence?: number;
  cost_basis?: number;
  realized_pnl?: number;
}): Trade {
  const db = getDb();
  const id = generateId();

  db.prepare(`
    INSERT INTO trades (
      id, agent_id, market_id, position_id, decision_id,
      trade_type, side, shares, price, total_amount,
      implied_confidence, cost_basis, realized_pnl
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    trade.agent_id,
    trade.market_id,
    trade.position_id,
    trade.decision_id,
    trade.trade_type,
    trade.side,
    trade.shares,
    trade.price,
    trade.total_amount,
    trade.implied_confidence,
    trade.cost_basis,
    trade.realized_pnl
  );

  return db.prepare('SELECT * FROM trades WHERE id = ?').get(id) as Trade;
}

export function getTradesByAgent(agentId: string, limit?: number): Trade[] {
  const db = getDb();

  if (limit) {
    return db.prepare(`
      SELECT * FROM trades
      WHERE agent_id = ?
      ORDER BY executed_at DESC
      LIMIT ?
    `).all(agentId, limit) as Trade[];
  }

  return db.prepare(`
    SELECT * FROM trades
    WHERE agent_id = ?
    ORDER BY executed_at DESC
  `).all(agentId) as Trade[];
}

export function getTradesByMarket(marketId: string): Trade[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM trades
    WHERE market_id = ?
    ORDER BY executed_at DESC
  `).all(marketId) as Trade[];
}

export function getTradesByDecision(decisionId: string): Trade[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM trades
    WHERE decision_id = ?
    ORDER BY executed_at ASC
  `).all(decisionId) as Trade[];
}
