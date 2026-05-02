import { generateId, getDb } from '../index';
import type { Trade } from '../../types';

export function createTrade(trade: {
  agent_id: string;
  market_id: string;
  position_id?: string;
  decision_id?: string;
  family_id?: string | null;
  release_id?: string | null;
  benchmark_config_model_id?: string | null;
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
  if (trade.position_id) {
    const position = db.prepare(`
      SELECT agent_id, market_id, side
      FROM positions
      WHERE id = ?
    `).get(trade.position_id) as { agent_id: string; market_id: string; side: string } | undefined;
    if (
      !position ||
      position.agent_id !== trade.agent_id ||
      position.market_id !== trade.market_id ||
      position.side !== trade.side
    ) {
      throw new Error('Trade position does not match agent, market, and side');
    }
  }

  if (trade.decision_id) {
    const decision = db.prepare(`
      SELECT agent_id
      FROM decisions
      WHERE id = ?
    `).get(trade.decision_id) as { agent_id: string } | undefined;
    if (!decision || decision.agent_id !== trade.agent_id) {
      throw new Error('Trade decision does not match agent');
    }
  }

  if (trade.family_id && trade.release_id) {
    const release = db.prepare(`
      SELECT family_id
      FROM model_releases
      WHERE id = ?
    `).get(trade.release_id) as { family_id: string } | undefined;
    if (!release || release.family_id !== trade.family_id) {
      throw new Error('Trade release does not match family');
    }
  }

  db.prepare(`
    INSERT INTO trades (
      id, agent_id, market_id, position_id, decision_id, family_id, release_id, benchmark_config_model_id,
      trade_type, side, shares, price, total_amount,
      implied_confidence, cost_basis, realized_pnl
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    trade.agent_id,
    trade.market_id,
    trade.position_id,
    trade.decision_id,
    trade.family_id ?? null,
    trade.release_id ?? null,
    trade.benchmark_config_model_id ?? null,
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
