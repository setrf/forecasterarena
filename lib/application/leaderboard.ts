import { getAggregateLeaderboard, getCohortSummaries } from '@/lib/db/queries';
import { getPublicCatalogModels } from '@/lib/catalog/public';

export interface LeaderboardData {
  leaderboard: ReturnType<typeof getAggregateLeaderboard>;
  cohorts: ReturnType<typeof getCohortSummaries>;
  models: ReturnType<typeof getPublicCatalogModels>;
  updated_at: string;
}

interface GetLeaderboardDataDependencies {
  getAggregateLeaderboard?: typeof getAggregateLeaderboard;
  getCohortSummaries?: typeof getCohortSummaries;
  getPublicCatalogModels?: typeof getPublicCatalogModels;
  now?: () => Date;
}

export function getLeaderboardData(
  dependencies: GetLeaderboardDataDependencies = {}
): LeaderboardData {
  const loadAggregateLeaderboard = dependencies.getAggregateLeaderboard ?? getAggregateLeaderboard;
  const loadCohortSummaries = dependencies.getCohortSummaries ?? getCohortSummaries;
  const loadPublicCatalogModels = dependencies.getPublicCatalogModels ?? getPublicCatalogModels;
  const now = dependencies.now ?? (() => new Date());

  return {
    leaderboard: loadAggregateLeaderboard(),
    cohorts: loadCohortSummaries(),
    models: loadPublicCatalogModels(),
    updated_at: now().toISOString()
  };
}
