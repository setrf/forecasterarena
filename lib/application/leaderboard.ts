import { getAggregateLeaderboard, getCohortSummaries } from '@/lib/db/queries';

export interface LeaderboardData {
  leaderboard: ReturnType<typeof getAggregateLeaderboard>;
  cohorts: ReturnType<typeof getCohortSummaries>;
  updated_at: string;
}

interface GetLeaderboardDataDependencies {
  getAggregateLeaderboard?: typeof getAggregateLeaderboard;
  getCohortSummaries?: typeof getCohortSummaries;
  now?: () => Date;
}

export function getLeaderboardData(
  dependencies: GetLeaderboardDataDependencies = {}
): LeaderboardData {
  const loadAggregateLeaderboard = dependencies.getAggregateLeaderboard ?? getAggregateLeaderboard;
  const loadCohortSummaries = dependencies.getCohortSummaries ?? getCohortSummaries;
  const now = dependencies.now ?? (() => new Date());

  return {
    leaderboard: loadAggregateLeaderboard(),
    cohorts: loadCohortSummaries(),
    updated_at: now().toISOString()
  };
}
