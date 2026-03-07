import { logSystemEvent } from '@/lib/db';
import { commitSellTrade } from '@/lib/engine/execution/sell/commit';
import { getSellExecutionContextOrError } from '@/lib/engine/execution/sell/context';
import { calculateSellEconomics } from '@/lib/engine/execution/sell/economics';
import { resolveSellCurrentPriceOrError } from '@/lib/engine/execution/sell/pricing';
import { toErrorMessage } from '@/lib/engine/execution/shared';
import type { SellResult } from '@/lib/engine/execution/types';
import type { SellInstruction } from '@/lib/openrouter/parser';

export function executeSell(
  agentId: string,
  sell: SellInstruction,
  decisionId?: string
): SellResult {
  try {
    const context = getSellExecutionContextOrError(agentId, sell);
    if (!context.ok) {
      return { success: false, error: context.error };
    }

    const { agent, position, market, sharesToSell } = context.value;
    const resolved = resolveSellCurrentPriceOrError(market, position.side);
    if (!resolved.ok) {
      return { success: false, error: resolved.error };
    }

    const { currentPrice } = resolved.value;
    const { proceeds, costBasisSold, realizedPnL } = calculateSellEconomics(
      position,
      sharesToSell,
      currentPrice
    );
    const committed = commitSellTrade({
      agentId,
      agent,
      market,
      position,
      decisionId,
      sharesToSell,
      currentPrice,
      proceeds,
      costBasisSold,
      realizedPnL
    });

    return {
      success: true,
      trade_id: committed.tradeId,
      proceeds,
      shares_sold: sharesToSell
    };
  } catch (error) {
    const message = toErrorMessage(error);
    logSystemEvent('trade_error', { agent_id: agentId, error: message }, 'error');
    return { success: false, error: message };
  }
}
