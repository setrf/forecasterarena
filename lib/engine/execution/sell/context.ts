import {
  getAgentById,
  getMarketById,
  getPositionById
} from '@/lib/db/queries';
import { fail } from '@/lib/engine/execution/shared';
import type { ExecResult } from '@/lib/engine/execution/types';
import type { SellInstruction } from '@/lib/openrouter/parser';
import type { Agent, Market, Position } from '@/lib/types';

export function getSellExecutionContextOrError(
  agentId: string,
  sell: SellInstruction
): ExecResult<{ agent: Agent; position: Position; market: Market; sharesToSell: number }> {
  const agent = getAgentById(agentId);
  if (!agent) {
    return fail('Agent not found');
  }

  const position = getPositionById(sell.position_id);
  if (!position) {
    return fail('Position not found');
  }

  if (position.agent_id !== agentId) {
    return fail('Position does not belong to agent');
  }

  if (position.status !== 'open') {
    return fail(`Position is ${position.status}`);
  }

  if (sell.percentage <= 0) {
    return fail('Sell percentage must be positive');
  }

  if (sell.percentage > 100) {
    return fail('Sell percentage cannot exceed 100%');
  }

  const market = getMarketById(position.market_id);
  if (!market) {
    return fail('Market not found');
  }

  if (market.status !== 'active') {
    return fail(`Market is ${market.status}`);
  }

  const sharesToSell = (sell.percentage / 100) * position.shares;
  if (sharesToSell <= 0) {
    return fail('No shares to sell');
  }

  return {
    ok: true,
    value: {
      agent,
      position,
      market,
      sharesToSell
    }
  };
}
