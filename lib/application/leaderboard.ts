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

const LEADERBOARD_CACHE_TTL_MS = 15_000;

let cachedLeaderboardData:
  | { expiresAt: number; data: LeaderboardData }
  | null = null;

export function getLeaderboardData(
  dependencies: GetLeaderboardDataDependencies = {}
): LeaderboardData {
  const loadAggregateLeaderboard = dependencies.getAggregateLeaderboard ?? getAggregateLeaderboard;
  const loadCohortSummaries = dependencies.getCohortSummaries ?? getCohortSummaries;
  const loadPublicCatalogModels = dependencies.getPublicCatalogModels ?? getPublicCatalogModels;
  const now = dependencies.now ?? (() => new Date());
  const nowMs = now().getTime();

  // The homepage hits this endpoint frequently, so a short in-process cache avoids
  // recomputing the expensive leaderboard query on every request.
  if (!dependencies.getAggregateLeaderboard && !dependencies.getCohortSummaries && !dependencies.getPublicCatalogModels) {
    if (cachedLeaderboardData && cachedLeaderboardData.expiresAt > nowMs) {
      return cachedLeaderboardData.data;
    }
  }

  const data = {
    leaderboard: loadAggregateLeaderboard(),
    cohorts: loadCohortSummaries(),
    models: loadPublicCatalogModels(),
    updated_at: new Date(nowMs).toISOString()
  };

  if (!dependencies.getAggregateLeaderboard && !dependencies.getCohortSummaries && !dependencies.getPublicCatalogModels) {
    cachedLeaderboardData = {
      expiresAt: nowMs + LEADERBOARD_CACHE_TTL_MS,
      data
    };
  }

  return data;
}
