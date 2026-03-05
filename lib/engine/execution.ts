/**
 * Trade Execution Engine
 * 
 * Handles the execution of BET and SELL decisions.
 * All trades are simulated (paper trading).
 * 
 * @module engine/execution
 */

import { withTransaction } from '../db';
import {
  getAgentById,
  updateAgentBalance,
  getMarketById,
  getPositionById,
  upsertPosition,
  reducePosition,
  createTrade
} from '../db/queries';
import { logSystemEvent } from '../db';
import { MAX_BET_PERCENT } from '../constants';
import type { Agent, Market, Position } from '../types';
import type { BetInstruction, SellInstruction } from '../openrouter/parser';

/**
 * Result of a bet execution
 */
export interface BetResult {
  success: boolean;
  trade_id?: string;
  position_id?: string;
  shares?: number;
  error?: string;
}

/**
 * Result of a sell execution
 */
export interface SellResult {
  success: boolean;
  trade_id?: string;
  proceeds?: number;
  shares_sold?: number;
  error?: string;
}

type ExecResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function fail<T>(error: string): ExecResult<T> {
  return { ok: false, error };
}

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
  const isBinary = market.market_type === 'binary';

  if (isBinary) {
    const normalizedSide = requestedSide.toUpperCase();
    if (normalizedSide !== 'YES' && normalizedSide !== 'NO') {
      return fail(
        `Invalid side "${requestedSide}" for binary market (must be YES or NO)`
      );
    }

    const yesPrice = market.current_price ?? 0.5;
    const price = normalizedSide === 'YES'
      ? yesPrice
      : (1 - yesPrice);

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

    const newCashBalance = args.agent.cash_balance - args.amount;
    const newTotalInvested = args.agent.total_invested + args.amount;
    updateAgentBalance(args.agentId, newCashBalance, newTotalInvested);

    return { position, trade };
  });

  return {
    tradeId: result.trade.id,
    positionId: result.position.id
  };
}

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
  const isBinary = market.market_type === 'binary';

  if (isBinary) {
    const normalizedSide = positionSide.toUpperCase();
    if (normalizedSide !== 'YES' && normalizedSide !== 'NO') {
      return fail(`Invalid side "${positionSide}" for binary market position`);
    }

    const yesPrice = market.current_price ?? 0.5;
    const currentPrice = normalizedSide === 'YES'
      ? yesPrice
      : (1 - yesPrice);

    if (!Number.isFinite(currentPrice) || currentPrice < 0 || currentPrice > 1) {
      return fail(`Invalid current price ${currentPrice} for side "${normalizedSide}"`);
    }

    return {
      ok: true,
      value: { currentPrice }
    };
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

    return {
      ok: true,
      value: { currentPrice }
    };
  } catch (error) {
    return fail(`Failed to parse multi-outcome prices: ${toErrorMessage(error)}`);
  }
}

function calculateSellEconomics(
  position: Position,
  sharesToSell: number,
  currentPrice: number
): { proceeds: number; costBasisSold: number; realizedPnL: number } {
  const proceeds = sharesToSell * currentPrice;
  const costBasisSold = (sharesToSell / position.shares) * position.total_cost;
  const realizedPnL = proceeds - costBasisSold;

  return {
    proceeds,
    costBasisSold,
    realizedPnL
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

    const newCashBalance = args.agent.cash_balance + args.proceeds;
    const newTotalInvested = args.agent.total_invested - args.costBasisSold;
    updateAgentBalance(args.agentId, newCashBalance, Math.max(0, newTotalInvested));

    return tradeRecord;
  });

  return { tradeId: trade.id };
}

/**
 * Execute a single bet
 *
 * All database operations are wrapped in a transaction to ensure atomicity.
 * If any operation fails, all changes are rolled back.
 *
 * @param agentId - Agent placing the bet
 * @param bet - Bet instruction
 * @param decisionId - Reference to the decision
 * @returns Bet result
 */
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
    const impliedConfidence = bet.amount / maxBet;

    const committed = commitBetTrade({
      agentId,
      agent,
      market,
      decisionId,
      sideForStorage,
      shares,
      price,
      amount: bet.amount,
      impliedConfidence
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

/**
 * Execute a single sell
 *
 * All database operations are wrapped in a transaction to ensure atomicity.
 * If any operation fails, all changes are rolled back.
 *
 * @param agentId - Agent selling
 * @param sell - Sell instruction
 * @param decisionId - Reference to the decision
 * @returns Sell result
 */
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

/**
 * Execute multiple bets
 * 
 * @param agentId - Agent placing bets
 * @param bets - Array of bet instructions
 * @param decisionId - Reference to the decision
 * @returns Array of results
 */
export function executeBets(
  agentId: string,
  bets: BetInstruction[],
  decisionId?: string
): BetResult[] {
  return bets.map((bet) => executeBet(agentId, bet, decisionId));
}

/**
 * Execute multiple sells
 * 
 * @param agentId - Agent selling
 * @param sells - Array of sell instructions
 * @param decisionId - Reference to the decision
 * @returns Array of results
 */
export function executeSells(
  agentId: string,
  sells: SellInstruction[],
  decisionId?: string
): SellResult[] {
  return sells.map((sell) => executeSell(agentId, sell, decisionId));
}
