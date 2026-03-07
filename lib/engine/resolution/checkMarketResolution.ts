import { logSystemEvent } from '@/lib/db';
import { resolveMarket } from '@/lib/db/queries';
import {
  handleCancelledMarket,
  processResolvedMarket
} from '@/lib/engine/resolution/settlement';
import type { MarketResolutionResult } from '@/lib/engine/resolution/types';
import { fetchMarketById, checkResolution } from '@/lib/polymarket/client';
import type { Market } from '@/lib/types';

export async function checkMarketResolution(market: Market): Promise<MarketResolutionResult> {
  if (!market.polymarket_id) {
    return { resolved: false, positions_settled: 0, errors: [] };
  }

  try {
    const polymarketData = await fetchMarketById(market.polymarket_id);
    if (!polymarketData) {
      console.log(`Market ${market.polymarket_id} not found on Polymarket`);
      return {
        resolved: false,
        positions_settled: 0,
        errors: [`Polymarket market ${market.polymarket_id} not found`]
      };
    }

    const resolution = checkResolution(polymarketData);
    if (!resolution.resolved) {
      return { resolved: false, positions_settled: 0, errors: [] };
    }

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
        errors: [resolution.error || 'Winner could not be determined; market refunded as CANCELLED']
      };
    }

    console.log(`Market resolved upstream: "${market.question.slice(0, 50)}..." → ${resolution.winner}`);

    const settled = processResolvedMarket(market, resolution.winner);
    if (settled.errors.length > 0) {
      logSystemEvent('market_resolution_partial_failure', {
        market_id: market.id,
        polymarket_id: market.polymarket_id,
        winning_outcome: resolution.winner,
        positions_settled: settled.positions_settled,
        errors: settled.errors
      }, 'error');

      return {
        resolved: false,
        positions_settled: settled.positions_settled,
        errors: settled.errors
      };
    }

    resolveMarket(market.id, resolution.winner);

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
