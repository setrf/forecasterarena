import type {
  MarketBrierScore,
  MarketDetail,
  MarketPosition,
  MarketTrade
} from '@/features/markets/detail/types';

interface MarketDetailPayload {
  market: MarketDetail;
  positions?: MarketPosition[];
  trades?: MarketTrade[];
  brier_scores?: MarketBrierScore[];
}

export type MarketDetailLoadResult =
  | {
      status: 'ok';
      data: {
        market: MarketDetail;
        positions: MarketPosition[];
        trades: MarketTrade[];
        brierScores: MarketBrierScore[];
      };
    }
  | {
      status: 'error';
      error: string;
    };

export async function fetchMarketDetailData(
  marketId: string,
  signal?: AbortSignal
): Promise<MarketDetailLoadResult> {
  const response = await fetch(`/api/markets/${marketId}`, { signal });
  if (!response.ok) {
    return {
      status: 'error',
      error: response.status === 404 ? 'Market not found' : 'Failed to load market'
    };
  }

  const payload = await response.json() as MarketDetailPayload;
  return {
    status: 'ok',
    data: {
      market: payload.market,
      positions: payload.positions || [],
      trades: payload.trades || [],
      brierScores: payload.brier_scores || []
    }
  };
}
