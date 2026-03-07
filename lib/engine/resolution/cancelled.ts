import { logSystemEvent, withTransaction } from '@/lib/db';
import {
  getAgentById,
  getMarketById,
  getMarketByPolymarketId,
  getPositionsByMarket,
  resolveMarket,
  settlePosition,
  updateAgentBalance
} from '@/lib/db/queries';

export function handleCancelledMarket(marketRef: string): number {
  const market = getMarketById(marketRef) ?? getMarketByPolymarketId(marketRef);
  if (!market) {
    return 0;
  }

  const positions = getPositionsByMarket(market.id);
  let refundedCount = 0;

  withTransaction(() => {
    for (const position of positions) {
      const agent = getAgentById(position.agent_id);
      if (!agent) {
        continue;
      }

      updateAgentBalance(
        position.agent_id,
        agent.cash_balance + position.total_cost,
        Math.max(0, agent.total_invested - position.total_cost)
      );

      settlePosition(position.id);
      refundedCount += 1;
    }

    resolveMarket(market.id, 'CANCELLED');
  });

  for (const position of positions) {
    logSystemEvent('position_refunded', {
      position_id: position.id,
      agent_id: position.agent_id,
      market_id: market.id,
      refund_amount: position.total_cost
    });
  }

  logSystemEvent('market_cancelled', {
    market_id: market.id,
    positions_refunded: refundedCount
  });

  return refundedCount;
}
