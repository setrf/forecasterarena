import { logSystemEvent, withTransaction } from '@/lib/db';
import {
  createTrade,
  getAgentById,
  getMarketById,
  updateAgentBalance,
  upsertPosition
} from '@/lib/db/queries';
import { MAX_BET_PERCENT } from '@/lib/constants';
import { fail, toErrorMessage } from '@/lib/engine/execution/shared';
import type { BetResult, ExecResult } from '@/lib/engine/execution/types';
import type { BetInstruction } from '@/lib/openrouter/parser';
import type { Agent, Market } from '@/lib/types';

function getBetExecutionContextOrError(
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

function resolveBetPriceAndSideOrError(
  market: Market,
  requestedSide: string
): ExecResult<{ sideForStorage: string; price: number }> {
  if (market.market_type === 'binary') {
    const normalizedSide = requestedSide.toUpperCase();
    if (normalizedSide !== 'YES' && normalizedSide !== 'NO') {
      return fail(`Invalid side "${requestedSide}" for binary market (must be YES or NO)`);
    }

    const yesPrice = market.current_price ?? 0.5;
    const price = normalizedSide === 'YES' ? yesPrice : (1 - yesPrice);

    if (!Number.isFinite(price) || price <= 0 || price > 1) {
      return fail(`Invalid executable price ${price} for side "${normalizedSide}"`);
    }

    return {
      ok: true,
      value: {
        sideForStorage: normalizedSide,
        price
      }
    };
  }

  try {
    const prices = JSON.parse(market.current_prices || '{}') as Record<string, unknown>;
    const outcomePrice = prices[requestedSide];

    if (outcomePrice === undefined || outcomePrice === null) {
      return fail(`No price available for outcome "${requestedSide}" in multi-outcome market`);
    }

    const price = parseFloat(String(outcomePrice));
    if (isNaN(price) || price <= 0 || price > 1) {
      return fail(`Invalid price ${outcomePrice} for outcome "${requestedSide}"`);
    }

    return {
      ok: true,
      value: {
        sideForStorage: requestedSide,
        price
      }
    };
  } catch (error) {
    return fail(`Failed to parse multi-outcome prices: ${toErrorMessage(error)}`);
  }
}

function commitBetTrade(args: {
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

  return {
    tradeId: result.trade.id,
    positionId: result.position.id
  };
}

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

    logSystemEvent('trade_executed', {
      agent_id: agentId,
      trade_id: committed.tradeId,
      type: 'BUY',
      market_id: market.id,
      side: sideForStorage,
      amount: bet.amount,
      shares,
      price
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
