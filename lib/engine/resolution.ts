/**
 * Market Resolution Engine
 * 
 * Handles checking for resolved markets and settling positions.
 * 
 * @module engine/resolution
 */

import { logSystemEvent, withTransaction } from '../db';
import {
  getClosedMarkets,
  getMarketById,
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

interface MarketResolutionResult {
  resolved: boolean;
  positions_settled: number;
  errors: string[];
}

/**
 * Settle a single position after market resolution
 *
 * All database operations are wrapped in a transaction to ensure atomicity.
 * If any operation fails, all changes are rolled back.
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

  // Calculate P/L
  const pnl = settlementValue - position.total_cost;

  // Execute all database operations in a transaction for atomicity
  withTransaction(() => {
    // Update agent balance
    const newCashBalance = agent.cash_balance + settlementValue;
    const newTotalInvested = Math.max(0, agent.total_invested - position.total_cost);
    updateAgentBalance(position.agent_id, newCashBalance, newTotalInvested);

    // Mark position as settled
    settlePosition(position.id);
  });

  // Log after successful transaction (outside transaction to avoid rollback on log failure)
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
): { positions_settled: number; errors: string[] } {
  // Get all open positions on this market
  const positions = getPositionsByMarket(market.id);
  const errors: string[] = [];
  
  if (positions.length === 0) {
    console.log(`No positions to settle for market ${market.id}`);
    return { positions_settled: 0, errors };
  }
  
  console.log(`Settling ${positions.length} position(s) for market "${market.question.slice(0, 50)}..."`);
  
  // Settle each position
  let positionsSettled = 0;
  for (const position of positions) {
    try {
      settlePositionForMarket(position, market, winningOutcome);
      positionsSettled++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error settling position ${position.id}:`, error);
      errors.push(`Position ${position.id}: ${message}`);
    }
  }
  
  // Record Brier scores
  recordBrierScoresForMarket(market, winningOutcome);
  
  return { positions_settled: positionsSettled, errors };
}

/**
 * Check a single market for resolution
 * 
 * @param market - Market to check
 * @returns Resolution outcome including settled position count and surfaced errors
 */
async function checkMarketResolution(market: Market): Promise<MarketResolutionResult> {
  if (!market.polymarket_id) {
    return {
      resolved: false,
      positions_settled: 0,
      errors: []
    };
  }
  
  try {
    // Fetch latest market data from Polymarket
    const polymarketData = await fetchMarketById(market.polymarket_id);
    
    if (!polymarketData) {
      console.log(`Market ${market.polymarket_id} not found on Polymarket`);
      return {
        resolved: false,
        positions_settled: 0,
        errors: [`Polymarket market ${market.polymarket_id} not found`]
      };
    }
    
    // Check if resolved
    const resolution = checkResolution(polymarketData);

    if (!resolution.resolved) {
      return {
        resolved: false,
        positions_settled: 0,
        errors: []
      };
    }

    // Handle UNKNOWN winner case conservatively by refunding positions.
    if (!resolution.winner || resolution.winner === 'UNKNOWN') {
      const refundCount = handleCancelledMarket(market.id);

      logSystemEvent('resolution_unknown_winner', {
        market_id: market.id,
        polymarket_id: market.polymarket_id,
        question: market.question.slice(0, 100),
        error: resolution.error || 'Winner could not be determined',
        fallback_outcome: 'CANCELLED',
        positions_refunded: refundCount
      }, 'error');

      console.error(
        `Market ${market.id} resolved but winner could not be determined - refunded as CANCELLED`
      );
      return {
        resolved: true,
        positions_settled: refundCount,
        errors: [
          resolution.error || 'Winner could not be determined; market refunded as CANCELLED'
        ]
      };
    }

    // Update market in our database
    resolveMarket(market.id, resolution.winner);
    
    console.log(`Market resolved: "${market.question.slice(0, 50)}..." → ${resolution.winner}`);
    
    // Settle positions
    const settled = processResolvedMarket(market, resolution.winner);
    
    logSystemEvent('market_resolved', {
      market_id: market.id,
      polymarket_id: market.polymarket_id,
      winning_outcome: resolution.winner,
      positions_settled: settled.positions_settled
    });
    
    return {
      resolved: true,
      positions_settled: settled.positions_settled,
      errors: settled.errors
    };
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error checking resolution for market ${market.id}:`, error);
    return {
      resolved: false,
      positions_settled: 0,
      errors: [message]
    };
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
      
      const marketResult = await checkMarketResolution(market);
      
      if (marketResult.resolved) {
        result.markets_resolved++;
      }

      result.positions_settled += marketResult.positions_settled;
      result.errors.push(
        ...marketResult.errors.map(error => `Market ${market.id}: ${error}`)
      );
      
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
    positions_settled: result.positions_settled,
    errors: result.errors.length
  });
  
  return result;
}

/**
 * Handle a cancelled market (refund all positions)
 *
 * All database operations are wrapped in a transaction to ensure atomicity.
 * Either all refunds succeed or all are rolled back.
 *
 * Accepts either the internal market id or the Polymarket id.
 *
 * @param marketRef - Internal market id or Polymarket id for the cancelled market
 * @returns Number of refunded positions
 */
export function handleCancelledMarket(marketRef: string): number {
  const market = getMarketById(marketRef) ?? getMarketByPolymarketId(marketRef);
  if (!market) return 0;

  const positions = getPositionsByMarket(market.id);
  let refundedCount = 0;

  // Execute all refunds in a single transaction for atomicity
  withTransaction(() => {
    for (const position of positions) {
      const agent = getAgentById(position.agent_id);
      if (!agent) continue;

      // Refund full cost basis
      const newCashBalance = agent.cash_balance + position.total_cost;
      const newTotalInvested = Math.max(0, agent.total_invested - position.total_cost);
      updateAgentBalance(position.agent_id, newCashBalance, newTotalInvested);

      // Close position (no settlement value)
      settlePosition(position.id);
      refundedCount++;
    }

    // Update market status
    resolveMarket(market.id, 'CANCELLED');
  });

  // Log after successful transaction (outside transaction to avoid rollback on log failure)
  for (const position of positions) {
    logSystemEvent('position_refunded', {
      position_id: position.id,
      agent_id: position.agent_id,
      market_id: market.id,
      refund_amount: position.total_cost
    });
  }

  logSystemEvent('market_cancelled', {
    market_id: market.id,
    positions_refunded: refundedCount
  });

  return refundedCount;
}
