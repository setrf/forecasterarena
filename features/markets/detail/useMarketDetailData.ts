'use client';

import { useEffect, useState } from 'react';
import { fetchMarketDetailData } from '@/features/markets/detail/api';
import type {
  MarketBrierScore,
  MarketDetail,
  MarketPosition,
  MarketTrade
} from '@/features/markets/detail/types';

export function useMarketDetailData(marketId: string) {
  const [market, setMarket] = useState<MarketDetail | null>(null);
  const [positions, setPositions] = useState<MarketPosition[]>([]);
  const [trades, setTrades] = useState<MarketTrade[]>([]);
  const [brierScores, setBrierScores] = useState<MarketBrierScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMarketDetail() {
      try {
        const result = await fetchMarketDetailData(marketId);
        if (result.status === 'error') {
          setError(result.error);
          return;
        }

        setMarket(result.data.market);
        setPositions(result.data.positions);
        setTrades(result.data.trades);
        setBrierScores(result.data.brierScores);
      } catch {
        setError('Failed to load market');
      } finally {
        setLoading(false);
      }
    }

    void loadMarketDetail();
  }, [marketId]);

  return {
    market,
    positions,
    trades,
    brierScores,
    loading,
    error
  };
}
