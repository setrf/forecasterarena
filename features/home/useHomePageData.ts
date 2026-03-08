'use client';

import { useEffect, useState } from 'react';
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
  const [chartError, setChartError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');

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
    async function loadChartData() {
      try {
        const performance = await fetchHomePerformanceData(timeRange);
        setChartData(performance.data);
        setChartModels(performance.models);
        setChartError(null);
      } catch {
        setChartError('Performance data is temporarily unavailable.');
      }
    }

    void loadChartData();
  }, [timeRange]);

  return {
    models,
    leaderboard,
    hasRealData,
    leaderboardError,
    marketCount,
    chartData,
    chartModels,
    chartError,
    timeRange,
    setTimeRange
  };
}
