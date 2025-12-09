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
  getOpenPositions,
  getMarketById,
  updatePositionMTM,
  createPortfolioSnapshot,
  getAverageBrierScore,
  getBrierScoresByAgent
} from '@/lib/db/queries';
import { calculatePositionValue } from '@/lib/scoring/pnl';
import { logSystemEvent } from '@/lib/db';
import { nowTimestamp } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return token === CRON_SECRET;
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
          const positions = getOpenPositions(agent.id);
          let positionsValue = 0;
          
          for (const position of positions) {
            const market = getMarketById(position.market_id);
            if (!market) continue;

            // Calculate current value based on market type
            let currentPrice: number;
            const isBinary = market.market_type === 'binary';

            if (isBinary) {
              // Binary market: use current_price for YES, (1 - price) for NO
              currentPrice = market.current_price || 0.5;
            } else {
              // Multi-outcome market: parse prices from JSON
              try {
                const prices = JSON.parse(market.current_prices || '{}');
                const outcomePrice = prices[position.side];

                if (outcomePrice === undefined || outcomePrice === null) {
                  console.warn(
                    `[Snapshot] No price for outcome "${position.side}" in market ${market.id}`
                  );
                  currentPrice = 0.5;
                } else {
                  currentPrice = parseFloat(outcomePrice);
                  if (isNaN(currentPrice) || currentPrice < 0 || currentPrice > 1) {
                    console.warn(
                      `[Snapshot] Invalid price ${outcomePrice} for "${position.side}"`
                    );
                    currentPrice = 0.5;
                  }
                }
              } catch (e) {
                console.warn(`[Snapshot] Failed to parse prices for market ${market.id}`);
                currentPrice = 0.5;
              }
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

