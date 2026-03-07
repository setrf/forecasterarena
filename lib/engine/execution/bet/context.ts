import { MAX_BET_PERCENT } from '@/lib/constants';
import {
  getAgentById,
  getMarketById
} from '@/lib/db/queries';
import { fail } from '@/lib/engine/execution/shared';
import type { ExecResult } from '@/lib/engine/execution/types';
import type { BetInstruction } from '@/lib/openrouter/parser';
import type { Agent, Market } from '@/lib/types';

export function getBetExecutionContextOrError(
  agentId: string,
  bet: BetInstruction
): ExecResult<{ agent: Agent; market: Market; maxBet: number }> {
  const agent = getAgentById(agentId);
  if (!agent) {
    return fail('Agent not found');
  }

  if (agent.status === 'bankrupt') {
    return fail('Agent is bankrupt');
  }

  const market = getMarketById(bet.market_id);
  if (!market) {
    return fail('Market not found');
  }

  if (market.status !== 'active') {
    return fail(`Market is ${market.status}`);
  }

  if (bet.amount <= 0) {
    return fail('Bet amount must be positive');
  }

  const maxBet = agent.cash_balance * MAX_BET_PERCENT;
  if (bet.amount > maxBet) {
    return fail(`Bet exceeds max (${maxBet.toFixed(2)})`);
  }

  if (bet.amount > agent.cash_balance) {
    return fail('Insufficient balance');
  }

  return {
    ok: true,
    value: { agent, market, maxBet }
  };
}
