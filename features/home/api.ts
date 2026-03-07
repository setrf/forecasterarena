import { hasLiveCompetitionData } from '@/lib/competition-state';
import type { TimeRange } from '@/components/charts/TimeRangeSelector';
import { emptyLeaderboard, type LeaderboardEntry } from '@/features/home/types';

interface HomeLeaderboardPayload {
  leaderboard?: LeaderboardEntry[];
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
}

export async function fetchHomeSummary(): Promise<{
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

  const leaderboard = leaderboardData.leaderboard && leaderboardData.leaderboard.length > 0
    ? leaderboardData.leaderboard
    : emptyLeaderboard;

  return {
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
): Promise<Array<{ date: string; [key: string]: number | string }>> {
  const response = await fetch(`/api/performance-data?range=${timeRange}`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Performance data is temporarily unavailable.');
  }

  const json = await response.json() as HomePerformancePayload;
  return json.data || [];
}
