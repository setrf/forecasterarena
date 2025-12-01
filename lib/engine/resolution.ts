/**
 * Market Resolution Engine
 * 
 * Handles checking for resolved markets and settling positions.
 * 
 * @module engine/resolution
 */

import { logSystemEvent } from '../db';
import {
  getClosedMarkets,
  getMarketByPolymarketId,
  resolveMarket,
  getPositionsByMarket,
  getAgentById,
  updateAgentBalance,
  settlePosition,
  getTradesByMarket,
  createBrierScore
} from '../db/queries';
import { fetchMarketById, checkResolution } from '../polymarket/client';
import { calculateSettlementValue } from '../scoring/pnl';
import { calculateBrierScore } from '../scoring/brier';
import type { Market, Position } from '../types';

/**
 * Result of checking resolutions
 */
export interface ResolutionCheckResult {
  markets_checked: number;
  markets_resolved: number;
  positions_settled: number;
  errors: string[];
}

/**
 * Settle a single position after market resolution
 * 
 * @param position - Position to settle
 * @param market - Resolved market
 * @param winningOutcome - The winning outcome
 */
function settlePositionForMarket(
  position: Position,
  market: Market,
  winningOutcome: string
): void {
  // Calculate settlement value
  const settlementValue = calculateSettlementValue(
    position.shares,
    position.side,
    winningOutcome
  );
  
  // Get agent
  const agent = getAgentById(position.agent_id);
  if (!agent) {
    console.error(`Agent not found for position ${position.id}`);
    return;
  }
  
  // Update agent balance
  const newCashBalance = agent.cash_balance + settlementValue;
  const newTotalInvested = Math.max(0, agent.total_invested - position.total_cost);
  updateAgentBalance(position.agent_id, newCashBalance, newTotalInvested);
  
  // Mark position as settled
  settlePosition(position.id);
  
  // Calculate P/L
  const pnl = settlementValue - position.total_cost;
  
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

/**
 * Record Brier scores for all trades on a resolved market
 * 
 * @param market - Resolved market
 * @param winningOutcome - The winning outcome
 * @returns Number of Brier scores recorded
 */
function recordBrierScoresForMarket(
  market: Market,
  winningOutcome: string
): number {
  const trades = getTradesByMarket(market.id);
  let recorded = 0;
  let skipped = 0;
  
  for (const trade of trades) {
    // Only score BUY trades (not SELLs)
    if (trade.trade_type !== 'BUY') continue;
    
    // Skip if no implied confidence - but log a warning
    if (trade.implied_confidence === null || trade.implied_confidence === undefined) {
      skipped++;
      console.warn(
        `[Brier] Skipping trade ${trade.id}: no implied_confidence recorded. ` +
        `Market: "${market.question.slice(0, 40)}..."`
      );
      continue;
    }
    
    // Validate implied confidence is in valid range
    if (trade.implied_confidence < 0 || trade.implied_confidence > 1) {
      skipped++;
      console.warn(
        `[Brier] Skipping trade ${trade.id}: invalid implied_confidence ${trade.implied_confidence}`
      );
      continue;
    }
    
    // Calculate Brier score
    const brierScore = calculateBrierScore(
      trade.implied_confidence,
      trade.side,
      winningOutcome
    );
    
    // Record score
    createBrierScore({
      agent_id: trade.agent_id,
      trade_id: trade.id,
      market_id: market.id,
      forecast_probability: trade.implied_confidence,
      actual_outcome: trade.side.toUpperCase() === winningOutcome.toUpperCase() ? 1 : 0,
      brier_score: brierScore
    });
    
    recorded++;
  }
  
  if (skipped > 0) {
    logSystemEvent('brier_scores_skipped', {
      market_id: market.id,
      skipped_count: skipped,
      recorded_count: recorded
    }, 'warning');
  }
  
  return recorded;
}

/**
 * Process a single resolved market
 * 
 * @param market - Market from our database
 * @param winningOutcome - The winning outcome
 * @returns Number of positions settled
 */
function processResolvedMarket(
  market: Market,
  winningOutcome: string
): number {
  // Get all open positions on this market
  const positions = getPositionsByMarket(market.id);
  
  if (positions.length === 0) {
    console.log(`No positions to settle for market ${market.id}`);
    return 0;
  }
  
  console.log(`Settling ${positions.length} position(s) for market "${market.question.slice(0, 50)}..."`);
  
  // Settle each position
  for (const position of positions) {
    try {
      settlePositionForMarket(position, market, winningOutcome);
    } catch (error) {
      console.error(`Error settling position ${position.id}:`, error);
    }
  }
  
  // Record Brier scores
  recordBrierScoresForMarket(market, winningOutcome);
  
  return positions.length;
}

/**
 * Check a single market for resolution
 * 
 * @param market - Market to check
 * @returns True if market was resolved
 */
async function checkMarketResolution(market: Market): Promise<boolean> {
  if (!market.polymarket_id) {
    return false;
  }
  
  try {
    // Fetch latest market data from Polymarket
    const polymarketData = await fetchMarketById(market.polymarket_id);
    
    if (!polymarketData) {
      console.log(`Market ${market.polymarket_id} not found on Polymarket`);
      return false;
    }
    
    // Check if resolved
    const resolution = checkResolution(polymarketData);
    
    if (!resolution.resolved) {
      return false;
    }
    
    if (!resolution.winner) {
      console.log(`Market ${market.id} resolved but no winner found`);
      return false;
    }
    
    // Update market in our database
    resolveMarket(market.id, resolution.winner);
    
    console.log(`Market resolved: "${market.question.slice(0, 50)}..." → ${resolution.winner}`);
    
    // Settle positions
    const settledCount = processResolvedMarket(market, resolution.winner);
    
    logSystemEvent('market_resolved', {
      market_id: market.id,
      polymarket_id: market.polymarket_id,
      winning_outcome: resolution.winner,
      positions_settled: settledCount
    });
    
    return true;
    
  } catch (error) {
    console.error(`Error checking resolution for market ${market.id}:`, error);
    return false;
  }
}

/**
 * Check all closed (but unresolved) markets for resolution
 * 
 * This is the main entry point for the resolution cron job.
 * 
 * @returns Resolution check result
 */
export async function checkAllResolutions(): Promise<ResolutionCheckResult> {
  console.log('Checking for market resolutions...');
  
  const result: ResolutionCheckResult = {
    markets_checked: 0,
    markets_resolved: 0,
    positions_settled: 0,
    errors: []
  };
  
  // Get markets that are closed but not resolved
  const closedMarkets = getClosedMarkets();
  
  console.log(`Found ${closedMarkets.length} closed market(s) to check`);
  
  for (const market of closedMarkets) {
    try {
      result.markets_checked++;
      
      const resolved = await checkMarketResolution(market);
      
      if (resolved) {
        result.markets_resolved++;
        // Count would need to come from the function
        // For now, we don't track this precisely
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Market ${market.id}: ${message}`);
    }
  }
  
  console.log(
    `Resolution check complete: ` +
    `${result.markets_checked} checked, ${result.markets_resolved} resolved`
  );
  
  logSystemEvent('resolution_check_complete', {
    markets_checked: result.markets_checked,
    markets_resolved: result.markets_resolved,
    errors: result.errors.length
  });
  
  return result;
}

/**
 * Handle a cancelled market (refund all positions)
 * 
 * @param marketId - Market that was cancelled
 */
export function handleCancelledMarket(marketId: string): void {
  const market = getMarketByPolymarketId(marketId);
  if (!market) return;
  
  const positions = getPositionsByMarket(market.id);
  
  for (const position of positions) {
    const agent = getAgentById(position.agent_id);
    if (!agent) continue;
    
    // Refund full cost basis
    const newCashBalance = agent.cash_balance + position.total_cost;
    const newTotalInvested = Math.max(0, agent.total_invested - position.total_cost);
    updateAgentBalance(position.agent_id, newCashBalance, newTotalInvested);
    
    // Close position (no settlement value)
    settlePosition(position.id);
    
    logSystemEvent('position_refunded', {
      position_id: position.id,
      agent_id: position.agent_id,
      market_id: market.id,
      refund_amount: position.total_cost
    });
  }
  
  // Update market status
  resolveMarket(market.id, 'CANCELLED');
  
  logSystemEvent('market_cancelled', {
    market_id: market.id,
    positions_refunded: positions.length
  });
}


