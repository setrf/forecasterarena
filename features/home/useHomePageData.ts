'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReleaseChangeEvent } from '@/components/charts/performance/types';
import type { TimeRange } from '@/components/charts/TimeRangeSelector';
import { fetchHomePerformanceData, fetchHomeSummary } from '@/features/home/api';
import { type CatalogModel, type LeaderboardEntry } from '@/features/home/types';

export function useHomePageData() {
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [hasRealData, setHasRealData] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [marketCount, setMarketCount] = useState<number | null>(null);
  const [chartData, setChartData] = useState<Array<{ date: string; [key: string]: number | string }>>([]);
  const [chartModels, setChartModels] = useState<CatalogModel[]>([]);
  const [chartReleaseChanges, setChartReleaseChanges] = useState<ReleaseChangeEvent[]>([]);
  const [chartError, setChartError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const chartRequestIdRef = useRef(0);

  useEffect(() => {
    async function loadHomeSummary() {
      try {
        const summary = await fetchHomeSummary();
        setModels(summary.models);
        setLeaderboard(summary.leaderboard);
        setHasRealData(summary.hasRealData);
        setMarketCount(summary.marketCount);
        setLeaderboardError(null);
      } catch {
        setLeaderboardError('Leaderboard data is temporarily unavailable.');
      }
    }

    void loadHomeSummary();
  }, []);

  useEffect(() => {
    const requestId = chartRequestIdRef.current + 1;
    chartRequestIdRef.current = requestId;
    const abortController = new AbortController();

    async function loadChartData() {
      try {
        const performance = await fetchHomePerformanceData(timeRange, abortController.signal);
        if (chartRequestIdRef.current !== requestId) {
          return;
        }

        setChartData(performance.data);
        setChartModels(performance.models);
        setChartReleaseChanges(performance.releaseChanges);
        setChartError(null);
      } catch (error) {
        if (abortController.signal.aborted || chartRequestIdRef.current !== requestId) {
          return;
        }

        setChartError('Performance data is temporarily unavailable.');
        setChartData([]);
        setChartModels([]);
        setChartReleaseChanges([]);
      }
    }

    void loadChartData();

    return () => {
      abortController.abort();
    };
  }, [timeRange]);

  return {
    models,
    leaderboard,
    hasRealData,
    leaderboardError,
    marketCount,
    chartData,
    chartModels,
    chartReleaseChanges,
    chartError,
    timeRange,
    setTimeRange
  };
}
