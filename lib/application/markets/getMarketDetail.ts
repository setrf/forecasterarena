import { getDb } from '@/lib/db';
import { getMarketById } from '@/lib/db/queries';
import {
  selectMarketBrierScores,
  selectMarketPositions,
  selectMarketTrades
} from '@/lib/application/markets/queries';
import type { MarketDetailResult } from '@/lib/application/markets/types';

export function getMarketDetail(marketId: string): MarketDetailResult {
  const market = getMarketById(marketId);
  if (!market) {
    return { status: 'not_found', error: 'Market not found' };
  }

  const db = getDb();

  return {
    status: 'ok',
    data: {
      market,
      positions: selectMarketPositions(db, marketId),
      trades: selectMarketTrades(db, marketId),
      brier_scores: market.status === 'resolved'
        ? selectMarketBrierScores(db, marketId)
        : [],
      updated_at: new Date().toISOString()
    }
  };
}
