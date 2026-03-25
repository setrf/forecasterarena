import type { CohortSummary } from '@/features/cohorts/list/types';

interface CohortsPayload {
  cohorts?: CohortSummary[];
}

export type CohortsListLoadResult =
  | {
      status: 'ok';
      data: CohortSummary[];
    }
  | {
      status: 'error';
      error: string;
    };

export async function fetchCohortsPageData(
  signal?: AbortSignal
): Promise<CohortsListLoadResult> {
  const response = await fetch('/api/leaderboard', {
    cache: 'no-store',
    signal
  });

  if (!response.ok) {
    return {
      status: 'error',
      error: 'Failed to load cohorts.'
    };
  }

  const json = await response.json() as CohortsPayload;
  return {
    status: 'ok',
    data: json.cohorts ?? []
  };
}
