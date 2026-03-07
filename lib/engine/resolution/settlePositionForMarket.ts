import { logSystemEvent, withTransaction } from '@/lib/db';
import {
  getAgentById,
  settlePosition,
  updateAgentBalance
} from '@/lib/db/queries';
import { calculateSettlementValue } from '@/lib/scoring/pnl';
import type { Market, Position } from '@/lib/types';

export function settlePositionForMarket(
  position: Position,
  market: Market,
  winningOutcome: string
): void {
  const settlementValue = calculateSettlementValue(position.shares, position.side, winningOutcome);
  const agent = getAgentById(position.agent_id);
  if (!agent) {
    console.error(`Agent not found for position ${position.id}`);
    return;
  }

  const pnl = settlementValue - position.total_cost;

  withTransaction(() => {
    updateAgentBalance(
      position.agent_id,
      agent.cash_balance + settlementValue,
      Math.max(0, agent.total_invested - position.total_cost)
    );
    settlePosition(position.id);
  });

  logSystemEvent('position_settled', {
    position_id: position.id,
    agent_id: position.agent_id,
    market_id: market.id,
    side: position.side,
    winning_outcome: winningOutcome,
    settlement_value: settlementValue,
    cost_basis: position.total_cost,
    pnl
  });

  console.log(
    `Settled position ${position.id}: ` +
    `${position.side} on "${market.question.slice(0, 50)}..." → ` +
    `${winningOutcome} wins, P/L: $${pnl.toFixed(2)}`
  );
}
