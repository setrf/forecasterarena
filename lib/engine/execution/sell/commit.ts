import { logSystemEvent, withTransaction } from '@/lib/db';
import {
  createTrade,
  reducePosition,
  updateAgentBalance
} from '@/lib/db/queries';
import { getTradeLineageSnapshot } from '@/lib/db/queries/trade-lineage';
import type { Agent, Market, Position } from '@/lib/types';

export function commitSellTrade(args: {
  agentId: string;
  agent: Agent;
  market: Market;
  position: Position;
  decisionId?: string;
  sharesToSell: number;
  currentPrice: number;
  proceeds: number;
  costBasisSold: number;
  realizedPnL: number;
}): { tradeId: string } {
  const trade = withTransaction(() => {
    const tradeRecord = createTrade({
      agent_id: args.agentId,
      market_id: args.market.id,
      position_id: args.position.id,
      decision_id: args.decisionId,
      ...getTradeLineageSnapshot({
        agentId: args.agentId,
        decisionId: args.decisionId
      }),
      trade_type: 'SELL',
      side: args.position.side,
      shares: args.sharesToSell,
      price: args.currentPrice,
      total_amount: args.proceeds,
      cost_basis: args.costBasisSold,
      realized_pnl: args.realizedPnL
    });

    reducePosition(args.position.id, args.sharesToSell);
    updateAgentBalance(
      args.agentId,
      args.agent.cash_balance + args.proceeds,
      Math.max(0, args.agent.total_invested - args.costBasisSold)
    );

    return tradeRecord;
  });

  logSystemEvent('trade_executed', {
    agent_id: args.agentId,
    trade_id: trade.id,
    type: 'SELL',
    market_id: args.market.id,
    side: args.position.side,
    shares: args.sharesToSell,
    proceeds: args.proceeds,
    price: args.currentPrice,
    cost_basis: args.costBasisSold,
    realized_pnl: args.realizedPnL
  });

  return { tradeId: trade.id };
}
