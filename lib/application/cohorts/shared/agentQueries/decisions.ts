import type { Db } from '@/lib/application/cohorts/shared/types';

interface AgentDecisionRow {
  id: string;
  decision_week: number;
  decision_timestamp: string;
  action: string;
  reasoning: string | null;
  trade_type: string | null;
  side: string | null;
  shares: number | null;
  price: number | null;
  total_amount: number | null;
  market_id: string | null;
  market_question: string | null;
}

interface AgentDecisionMarketRow {
  trade_type: string;
  side: string;
  shares: number;
  price: number;
  total_amount: number;
  market_id: string;
  market_question: string;
}

type AgentDecisionWithMarkets = Record<string, unknown> & {
  id: string;
  decision_week: number;
  decision_timestamp: string;
  action: string;
  reasoning: string | null;
  markets: AgentDecisionMarketRow[];
};

export function getAgentDecisionsWithMarkets(
  db: Db,
  agentId: string
): Array<Record<string, unknown>> {
  const rows = db.prepare(`
    SELECT
      d.id,
      d.decision_week,
      d.decision_timestamp,
      d.action,
      d.reasoning,
      t.trade_type,
      t.side,
      t.shares,
      t.price,
      t.total_amount,
      m.id as market_id,
      m.question as market_question
    FROM (
      SELECT
        id,
        decision_week,
        decision_timestamp,
        action,
        reasoning
      FROM decisions
      WHERE agent_id = ?
      ORDER BY decision_timestamp DESC
      LIMIT 20
    ) d
    LEFT JOIN trades t ON t.decision_id = d.id
    LEFT JOIN markets m ON m.id = t.market_id
    ORDER BY d.decision_timestamp DESC, t.executed_at ASC
  `).all(agentId) as AgentDecisionRow[];

  const decisions = new Map<string, AgentDecisionWithMarkets>();

  for (const row of rows) {
    const existing = decisions.get(row.id);
    if (existing) {
      if (row.market_id) {
        existing.markets.push(toAgentDecisionMarket(row));
      }
      continue;
    }

    decisions.set(row.id, {
      id: row.id,
      decision_week: row.decision_week,
      decision_timestamp: row.decision_timestamp,
      action: row.action,
      reasoning: row.reasoning,
      markets: row.market_id ? [toAgentDecisionMarket(row)] : []
    });
  }

  return Array.from(decisions.values());
}

function toAgentDecisionMarket(row: AgentDecisionRow): AgentDecisionMarketRow {
  return {
    trade_type: row.trade_type ?? '',
    side: row.side ?? '',
    shares: row.shares ?? 0,
    price: row.price ?? 0,
    total_amount: row.total_amount ?? 0,
    market_id: row.market_id ?? '',
    market_question: row.market_question ?? ''
  };
}
