import { hasLiveCompetitionData } from '@/lib/competition-state';
import type { CatalogModel, LeaderboardResponse, ModelStats } from '@/features/models/list/types';

export type ModelsListLoadResult =
  | {
      status: 'ok';
      data: {
        models: CatalogModel[];
        leaderboard: ModelStats[];
        hasRealData: boolean;
      };
    }
  | {
      status: 'error';
      error: string;
    };

export async function fetchModelsPageData(
  signal?: AbortSignal
): Promise<ModelsListLoadResult> {
  const response = await fetch('/api/leaderboard', {
    cache: 'no-store',
    signal
  });

  if (!response.ok) {
    return {
      status: 'error',
      error: 'Failed to load model rankings.'
    };
  }

  const data = await response.json() as LeaderboardResponse;
  return {
    status: 'ok',
    data: {
      models: data.models ?? [],
      leaderboard: data.leaderboard ?? [],
      hasRealData: hasLiveCompetitionData({
        leaderboard: data.leaderboard,
        cohorts: data.cohorts
      })
    }
  };
}
