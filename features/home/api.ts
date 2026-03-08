import { hasLiveCompetitionData } from '@/lib/competition-state';
import type { TimeRange } from '@/components/charts/TimeRangeSelector';
import type { ReleaseChangeEvent } from '@/components/charts/performance/types';
import {
  createEmptyLeaderboard,
  type CatalogModel,
  type LeaderboardEntry
} from '@/features/home/types';

interface HomeLeaderboardPayload {
  leaderboard?: LeaderboardEntry[];
  models?: CatalogModel[];
  cohorts?: Array<{
    total_markets_traded?: number | null;
  }>;
}

interface HomeMarketsPayload {
  stats?: {
    total_markets?: number;
  };
}

interface HomePerformancePayload {
  data?: Array<{ date: string; [key: string]: number | string }>;
  models?: Array<CatalogModel & { name?: string }>;
  release_changes?: ReleaseChangeEvent[];
}

export async function fetchHomeSummary(): Promise<{
  models: CatalogModel[];
  leaderboard: LeaderboardEntry[];
  hasRealData: boolean;
  marketCount: number | null;
}> {
  const [leaderboardRes, marketsRes] = await Promise.all([
    fetch('/api/leaderboard', { cache: 'no-store' }),
    fetch('/api/markets?limit=1', { cache: 'no-store' })
  ]);

  if (!leaderboardRes.ok) {
    throw new Error('Leaderboard data is temporarily unavailable.');
  }

  const [leaderboardData, marketsData] = await Promise.all([
    leaderboardRes.json() as Promise<HomeLeaderboardPayload>,
    marketsRes.ok
      ? marketsRes.json() as Promise<HomeMarketsPayload>
      : Promise.resolve<HomeMarketsPayload | null>(null)
  ]);

  const models = leaderboardData.models ?? [];
  const leaderboard = leaderboardData.leaderboard && leaderboardData.leaderboard.length > 0
    ? leaderboardData.leaderboard
    : createEmptyLeaderboard(models);

  return {
    models,
    leaderboard,
    hasRealData: hasLiveCompetitionData({
      leaderboard: leaderboardData.leaderboard,
      cohorts: leaderboardData.cohorts
    }),
    marketCount: marketsData?.stats?.total_markets ?? null
  };
}

export async function fetchHomePerformanceData(
  timeRange: TimeRange
): Promise<{
  data: Array<{ date: string; [key: string]: number | string }>;
  models: CatalogModel[];
  releaseChanges: ReleaseChangeEvent[];
}> {
  const response = await fetch(`/api/performance-data?range=${timeRange}`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Performance data is temporarily unavailable.');
  }

  const json = await response.json() as HomePerformancePayload;
  return {
    data: json.data || [],
    models: (json.models || []).map((model) => ({
      ...model,
      displayName: model.displayName ?? model.name ?? model.shortDisplayName ?? model.id
    })),
    releaseChanges: json.release_changes || []
  };
}
