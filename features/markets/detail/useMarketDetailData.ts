'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchMarketDetailData } from '@/features/markets/detail/api';
import type {
  MarketBrierScore,
  MarketDetail,
  MarketPosition,
  MarketTrade
} from '@/features/markets/detail/types';
import type { MarketDetailLoadResult } from '@/features/markets/detail/api';

type MarketDetailData = Extract<MarketDetailLoadResult, { status: 'ok' }>['data'];

export function useMarketDetailData(marketId: string, initialData: MarketDetailData | null = null) {
  const [market, setMarket] = useState<MarketDetail | null>(initialData?.market ?? null);
  const [positions, setPositions] = useState<MarketPosition[]>(initialData?.positions ?? []);
  const [trades, setTrades] = useState<MarketTrade[]>(initialData?.trades ?? []);
  const [brierScores, setBrierScores] = useState<MarketBrierScore[]>(initialData?.brierScores ?? []);
  const [loading, setLoading] = useState(initialData === null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const abortController = new AbortController();

    setMarket(initialData?.market ?? null);
    setPositions(initialData?.positions ?? []);
    setTrades(initialData?.trades ?? []);
    setBrierScores(initialData?.brierScores ?? []);
    setError(null);
    setLoading(initialData === null);

    if (initialData !== null) {
      return () => {
        abortController.abort();
      };
    }

    async function loadMarketDetail() {
      try {
        const result = await fetchMarketDetailData(marketId, abortController.signal);
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        if (result.status === 'error') {
          setMarket(null);
          setPositions([]);
          setTrades([]);
          setBrierScores([]);
          setError(result.error);
          return;
        }

        setMarket(result.data.market);
        setPositions(result.data.positions);
        setTrades(result.data.trades);
        setBrierScores(result.data.brierScores);
      } catch {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setMarket(null);
        setPositions([]);
        setTrades([]);
        setBrierScores([]);
        setError('Failed to load market');
      } finally {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setLoading(false);
      }
    }

    void loadMarketDetail();

    return () => {
      abortController.abort();
    };
  }, [marketId, initialData]);

  return {
    market,
    positions,
    trades,
    brierScores,
    loading,
    error
  };
}
