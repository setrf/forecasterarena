import { logSystemEvent, withTransaction } from '@/lib/db';
import {
  createTrade,
  getAgentById,
  getMarketById,
  getPositionById,
  reducePosition,
  updateAgentBalance
} from '@/lib/db/queries';
import { fail, toErrorMessage } from '@/lib/engine/execution/shared';
import type { ExecResult, SellResult } from '@/lib/engine/execution/types';
import type { SellInstruction } from '@/lib/openrouter/parser';
import type { Agent, Market, Position } from '@/lib/types';

function getSellExecutionContextOrError(
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

function resolveSellCurrentPriceOrError(
  market: Market,
  positionSide: string
): ExecResult<{ currentPrice: number }> {
  if (market.market_type === 'binary') {
    const normalizedSide = positionSide.toUpperCase();
    if (normalizedSide !== 'YES' && normalizedSide !== 'NO') {
      return fail(`Invalid side "${positionSide}" for binary market position`);
    }

    const yesPrice = market.current_price ?? 0.5;
    const currentPrice = normalizedSide === 'YES' ? yesPrice : (1 - yesPrice);

    if (!Number.isFinite(currentPrice) || currentPrice < 0 || currentPrice > 1) {
      return fail(`Invalid current price ${currentPrice} for side "${normalizedSide}"`);
    }

    return { ok: true, value: { currentPrice } };
  }

  try {
    const prices = JSON.parse(market.current_prices || '{}') as Record<string, unknown>;
    const outcomePrice = prices[positionSide];

    if (outcomePrice === undefined || outcomePrice === null) {
      return fail(`No current price available for outcome "${positionSide}"`);
    }

    const currentPrice = parseFloat(String(outcomePrice));
    if (isNaN(currentPrice) || currentPrice < 0 || currentPrice > 1) {
      return fail(`Invalid current price ${outcomePrice} for outcome "${positionSide}"`);
    }

    return { ok: true, value: { currentPrice } };
  } catch (error) {
    return fail(`Failed to parse multi-outcome prices: ${toErrorMessage(error)}`);
  }
}

function calculateSellEconomics(
  position: Position,
  sharesToSell: number,
  currentPrice: number
) {
  const proceeds = sharesToSell * currentPrice;
  const costBasisSold = (sharesToSell / position.shares) * position.total_cost;
  return {
    proceeds,
    costBasisSold,
    realizedPnL: proceeds - costBasisSold
  };
}

function commitSellTrade(args: {
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

  return { tradeId: trade.id };
}

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

    logSystemEvent('trade_executed', {
      agent_id: agentId,
      trade_id: committed.tradeId,
      type: 'SELL',
      market_id: market.id,
      side: position.side,
      shares: sharesToSell,
      proceeds,
      price: currentPrice,
      cost_basis: costBasisSold,
      realized_pnl: realizedPnL
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
