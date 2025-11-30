/**
 * Trade Execution Engine
 * 
 * Handles the execution of BET and SELL decisions.
 * All trades are simulated (paper trading).
 * 
 * @module engine/execution
 */

import { generateId } from '../db';
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

/**
 * Execute a single bet
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
    const agent = getAgentById(agentId);
    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }
    
    if (agent.status === 'bankrupt') {
      return { success: false, error: 'Agent is bankrupt' };
    }
    
    const market = getMarketById(bet.market_id);
    if (!market) {
      return { success: false, error: 'Market not found' };
    }
    
    if (market.status !== 'active') {
      return { success: false, error: `Market is ${market.status}` };
    }
    
    // Validate bet amount
    const maxBet = agent.cash_balance * MAX_BET_PERCENT;
    if (bet.amount > maxBet) {
      return { success: false, error: `Bet exceeds max (${maxBet.toFixed(2)})` };
    }
    
    if (bet.amount > agent.cash_balance) {
      return { success: false, error: 'Insufficient balance' };
    }
    
    // Get current price for the side
    const isBinary = market.market_type === 'binary';
    let price: number;
    
    if (isBinary) {
      price = bet.side === 'YES' 
        ? (market.current_price || 0.5)
        : (1 - (market.current_price || 0.5));
    } else {
      // Multi-outcome: parse prices from JSON
      const prices = JSON.parse(market.current_prices || '{}');
      price = prices[bet.side] || 0.5;
    }
    
    // Calculate shares (amount / price)
    const shares = bet.amount / price;
    
    // Calculate implied confidence for Brier scoring
    const impliedConfidence = bet.amount / maxBet;
    
    // Create or update position
    const position = upsertPosition(
      agentId,
      market.id,
      bet.side,
      shares,
      price,
      bet.amount
    );
    
    // Record trade
    const trade = createTrade({
      agent_id: agentId,
      market_id: market.id,
      position_id: position.id,
      decision_id: decisionId,
      trade_type: 'BUY',
      side: bet.side,
      shares,
      price,
      total_amount: bet.amount,
      implied_confidence: impliedConfidence
    });
    
    // Update agent balance
    const newCashBalance = agent.cash_balance - bet.amount;
    const newTotalInvested = agent.total_invested + bet.amount;
    updateAgentBalance(agentId, newCashBalance, newTotalInvested);
    
    logSystemEvent('trade_executed', {
      agent_id: agentId,
      trade_id: trade.id,
      type: 'BUY',
      market_id: market.id,
      side: bet.side,
      amount: bet.amount,
      shares,
      price
    });
    
    return {
      success: true,
      trade_id: trade.id,
      position_id: position.id,
      shares
    };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logSystemEvent('trade_error', { agent_id: agentId, error: message }, 'error');
    return { success: false, error: message };
  }
}

/**
 * Execute a single sell
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
    const agent = getAgentById(agentId);
    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }
    
    const position = getPositionById(sell.position_id);
    if (!position) {
      return { success: false, error: 'Position not found' };
    }
    
    if (position.agent_id !== agentId) {
      return { success: false, error: 'Position does not belong to agent' };
    }
    
    if (position.status !== 'open') {
      return { success: false, error: `Position is ${position.status}` };
    }
    
    const market = getMarketById(position.market_id);
    if (!market) {
      return { success: false, error: 'Market not found' };
    }
    
    // Calculate shares to sell
    const sharesToSell = (sell.percentage / 100) * position.shares;
    
    // Get current price
    const isBinary = market.market_type === 'binary';
    let currentPrice: number;
    
    if (isBinary) {
      currentPrice = position.side === 'YES'
        ? (market.current_price || 0.5)
        : (1 - (market.current_price || 0.5));
    } else {
      const prices = JSON.parse(market.current_prices || '{}');
      currentPrice = prices[position.side] || 0.5;
    }
    
    // Calculate proceeds
    const proceeds = sharesToSell * currentPrice;
    
    // Record trade
    const trade = createTrade({
      agent_id: agentId,
      market_id: market.id,
      position_id: position.id,
      decision_id: decisionId,
      trade_type: 'SELL',
      side: position.side,
      shares: sharesToSell,
      price: currentPrice,
      total_amount: proceeds
    });
    
    // Calculate cost basis of shares sold
    const costBasisSold = (sharesToSell / position.shares) * position.total_cost;
    
    // Reduce position
    reducePosition(position.id, sharesToSell);
    
    // Update agent balance
    const newCashBalance = agent.cash_balance + proceeds;
    const newTotalInvested = agent.total_invested - costBasisSold;
    updateAgentBalance(agentId, newCashBalance, Math.max(0, newTotalInvested));
    
    logSystemEvent('trade_executed', {
      agent_id: agentId,
      trade_id: trade.id,
      type: 'SELL',
      market_id: market.id,
      side: position.side,
      shares: sharesToSell,
      proceeds,
      price: currentPrice
    });
    
    return {
      success: true,
      trade_id: trade.id,
      proceeds,
      shares_sold: sharesToSell
    };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
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
  const results: BetResult[] = [];
  
  for (const bet of bets) {
    const result = executeBet(agentId, bet, decisionId);
    results.push(result);
  }
  
  return results;
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
  const results: SellResult[] = [];
  
  for (const sell of sells) {
    const result = executeSell(agentId, sell, decisionId);
    results.push(result);
  }
  
  return results;
}

