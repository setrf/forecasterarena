import { logSystemEvent, withTransaction } from '@/lib/db';
import {
  createTrade,
  updateAgentBalance,
  upsertPosition
} from '@/lib/db/queries';
import { getTradeLineageSnapshot } from '@/lib/db/queries/trade-lineage';
import type { Agent, Market } from '@/lib/types';

export function commitBetTrade(args: {
  agentId: string;
  agent: Agent;
  market: Market;
  decisionId?: string;
  sideForStorage: string;
  shares: number;
  price: number;
  amount: number;
  impliedConfidence: number;
}): { tradeId: string; positionId: string } {
  const result = withTransaction(() => {
    const position = upsertPosition(
      args.agentId,
      args.market.id,
      args.sideForStorage,
      args.shares,
      args.price,
      args.amount
    );

    const trade = createTrade({
      agent_id: args.agentId,
      market_id: args.market.id,
      position_id: position.id,
      decision_id: args.decisionId,
      ...getTradeLineageSnapshot({
        agentId: args.agentId,
        decisionId: args.decisionId
      }),
      trade_type: 'BUY',
      side: args.sideForStorage,
      shares: args.shares,
      price: args.price,
      total_amount: args.amount,
      implied_confidence: args.impliedConfidence
    });

    updateAgentBalance(
      args.agentId,
      args.agent.cash_balance - args.amount,
      args.agent.total_invested + args.amount
    );

    return { position, trade };
  });

  logSystemEvent('trade_executed', {
    agent_id: args.agentId,
    trade_id: result.trade.id,
    type: 'BUY',
    market_id: args.market.id,
    side: args.sideForStorage,
    amount: args.amount,
    shares: args.shares,
    price: args.price
  });

  return {
    tradeId: result.trade.id,
    positionId: result.position.id
  };
}
