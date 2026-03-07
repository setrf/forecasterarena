import { logSystemEvent } from '@/lib/db';
import { commitBetTrade } from '@/lib/engine/execution/bet/commit';
import { getBetExecutionContextOrError } from '@/lib/engine/execution/bet/context';
import { resolveBetPriceAndSideOrError } from '@/lib/engine/execution/bet/pricing';
import { toErrorMessage } from '@/lib/engine/execution/shared';
import type { BetResult } from '@/lib/engine/execution/types';
import type { BetInstruction } from '@/lib/openrouter/parser';

export function executeBet(
  agentId: string,
  bet: BetInstruction,
  decisionId?: string
): BetResult {
  try {
    const context = getBetExecutionContextOrError(agentId, bet);
    if (!context.ok) {
      return { success: false, error: context.error };
    }

    const { agent, market, maxBet } = context.value;
    const resolved = resolveBetPriceAndSideOrError(market, bet.side);
    if (!resolved.ok) {
      return { success: false, error: resolved.error };
    }

    const { sideForStorage, price } = resolved.value;
    const shares = bet.amount / price;
    const committed = commitBetTrade({
      agentId,
      agent,
      market,
      decisionId,
      sideForStorage,
      shares,
      price,
      amount: bet.amount,
      impliedConfidence: bet.amount / maxBet
    });

    return {
      success: true,
      trade_id: committed.tradeId,
      position_id: committed.positionId,
      shares
    };
  } catch (error) {
    const message = toErrorMessage(error);
    logSystemEvent('trade_error', { agent_id: agentId, error: message }, 'error');
    return { success: false, error: message };
  }
}
