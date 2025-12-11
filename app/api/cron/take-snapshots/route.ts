/**
 * Take Snapshots Cron Endpoint
 * 
 * Takes daily portfolio snapshots for all agents.
 * Schedule: Daily at 00:00 UTC
 * 
 * @route POST /api/cron/take-snapshots
 */

import { NextRequest, NextResponse } from 'next/server';
import { CRON_SECRET, INITIAL_BALANCE } from '@/lib/constants';
import {
  getActiveCohorts,
  getAgentsByCohort,
  getAllOpenPositions,
  getMarketById,
  updatePositionMTM,
  createPortfolioSnapshot,
  getAverageBrierScore,
  getBrierScoresByAgent
} from '@/lib/db/queries';
import { calculatePositionValue } from '@/lib/scoring/pnl';
import { logSystemEvent } from '@/lib/db';
import { nowTimestamp } from '@/lib/utils';
import { constantTimeCompare } from '@/lib/utils/security';

export const dynamic = 'force-dynamic';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return constantTimeCompare(token, CRON_SECRET);
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    console.log('Taking portfolio snapshots...');

    const startTime = Date.now();
    const snapshotTimestamp = nowTimestamp();
    
    let snapshotsTaken = 0;
    let positionsUpdated = 0;
    const errors: string[] = [];
    
    const activeCohorts = getActiveCohorts();
    
    for (const cohort of activeCohorts) {
      const agents = getAgentsByCohort(cohort.id);
      
      for (const agent of agents) {
        try {
          // Get and update positions MTM
          // Use all open positions (including on closed/unresolved markets) so valuation isn't lost when trading closes.
          const positions = getAllOpenPositions(agent.id);
          let positionsValue = 0;
          const fallbackFromPosition = (pos: typeof positions[number]) => {
            if (!pos || pos.shares <= 0 || pos.current_value === null || pos.current_value === undefined) {
              return null;
            }

            const valuePerShare = pos.current_value / pos.shares;
            if (!Number.isFinite(valuePerShare)) return null;

            // Translate the current position value back into a YES price.
            const side = (pos.side || '').toUpperCase();
            const impliedYesPrice =
              side === 'NO'
                ? 1 - valuePerShare
                : valuePerShare;

            return Math.min(Math.max(impliedYesPrice, 0), 1);
          };
          
        for (const position of positions) {
          const market = getMarketById(position.market_id);
          if (!market) continue;

          // Calculate current value based on market type
          let currentPrice: number | null = null;
          const unresolvedClosed = market.status === 'closed' && !market.resolution_outcome;
          const isBinary = market.market_type === 'binary';

          if (isBinary) {
            // Binary market: use current_price for YES, (1 - price) for NO
            if (typeof market.current_price === 'number' && !Number.isNaN(market.current_price)) {
              currentPrice = market.current_price;
            } else {
              const fallbackPrice = fallbackFromPosition(position);
              if (fallbackPrice === null) {
                console.warn(
                  `[Snapshot] Missing price for market ${market.id}; keeping prior value for position ${position.id}`
                );
                currentPrice = null;
              } else {
                currentPrice = fallbackPrice;
                console.warn(
                  `[Snapshot] Using fallback price ${fallbackPrice.toFixed(4)} for market ${market.id} from prior value`
                );
              }
            }
          } else {
            // Multi-outcome market: parse prices from JSON
            try {
              const prices = JSON.parse(market.current_prices || '{}');
              const outcomePrice = prices[position.side];

              if (outcomePrice === undefined || outcomePrice === null) {
                const fallbackPrice = fallbackFromPosition(position);
                if (fallbackPrice === null) {
                  console.warn(
                    `[Snapshot] No price for outcome "${position.side}" in market ${market.id}; keeping prior value`
                  );
                  currentPrice = null;
                } else {
                  currentPrice = fallbackPrice;
                  console.warn(
                    `[Snapshot] Using fallback price ${fallbackPrice.toFixed(4)} for outcome "${position.side}" in market ${market.id}`
                  );
                }
              } else {
                currentPrice = parseFloat(outcomePrice);
                if (isNaN(currentPrice) || currentPrice < 0 || currentPrice > 1) {
                  const fallbackPrice = fallbackFromPosition(position);
                  if (fallbackPrice === null) {
                    console.warn(
                      `[Snapshot] Invalid price ${outcomePrice} for "${position.side}" in market ${market.id}; keeping prior value`
                    );
                    currentPrice = null;
                  } else {
                    currentPrice = fallbackPrice;
                    console.warn(
                      `[Snapshot] Using fallback price ${fallbackPrice.toFixed(4)} for invalid outcome price in market ${market.id}`
                    );
                  }
                }
              }
            } catch (e) {
              console.warn(`[Snapshot] Failed to parse prices for market ${market.id}; keeping prior value`);
              currentPrice = null;
            }
          }

          // If the market is closed but unresolved and the price would wipe the position (YES at 0 or NO at 1), keep prior value
          const wouldZeroPosition =
            currentPrice !== null &&
            ((position.side.toUpperCase() === 'YES' && currentPrice === 0) ||
              (position.side.toUpperCase() === 'NO' && currentPrice === 1));

          if (unresolvedClosed && (currentPrice === null || wouldZeroPosition)) {
            const fallbackPrice = fallbackFromPosition(position);
            if (fallbackPrice !== null) {
              currentPrice = fallbackPrice;
              console.warn(
                `[Snapshot] Using prior value fallback ${fallbackPrice.toFixed(4)} for closed-unresolved market ${market.id}`
              );
            }
          }

          // Fallback if still null: derive from prior value or default 0.5
          if (currentPrice === null) {
            const derived = fallbackFromPosition(position);
            currentPrice = derived !== null ? derived : 0.5;
          }

          const value = calculatePositionValue(
            position.shares,
            position.side,
            currentPrice
          );
            const unrealizedPnl = value - position.total_cost;

            // Update position MTM
            updatePositionMTM(position.id, value, unrealizedPnl);
            positionsValue += value;
            positionsUpdated++;
          }
          
          // Calculate totals
          const totalValue = agent.cash_balance + positionsValue;
          const totalPnl = totalValue - INITIAL_BALANCE;
          const totalPnlPercent = (totalPnl / INITIAL_BALANCE) * 100;
          
          // Get Brier score
          const brierScore = getAverageBrierScore(agent.id);
          const brierScores = getBrierScoresByAgent(agent.id);
          
          // Create snapshot
          createPortfolioSnapshot({
            agent_id: agent.id,
            snapshot_timestamp: snapshotTimestamp,
            cash_balance: agent.cash_balance,
            positions_value: positionsValue,
            total_value: totalValue,
            total_pnl: totalPnl,
            total_pnl_percent: totalPnlPercent,
            brier_score: brierScore ?? undefined,
            num_resolved_bets: brierScores.length
          });
          
          snapshotsTaken++;
          
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`Agent ${agent.id}: ${message}`);
        }
      }
    }
    
    const duration = Date.now() - startTime;
    
    logSystemEvent('snapshots_taken', {
      snapshots: snapshotsTaken,
      positions_updated: positionsUpdated,
      errors: errors.length,
      duration_ms: duration
    });
    
    console.log(
      `Snapshots complete: ${snapshotsTaken} snapshots, ` +
      `${positionsUpdated} positions updated`
    );
    
    return NextResponse.json({
      success: true,
      snapshots_taken: snapshotsTaken,
      positions_updated: positionsUpdated,
      errors: errors.length,
      duration_ms: duration
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    
    logSystemEvent('take_snapshots_error', { error: message }, 'error');
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
