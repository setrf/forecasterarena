import type { AgentCohortData } from '@/features/cohorts/model-detail/types';

export type AgentCohortDetailLoadResult =
  | {
      status: 'ok';
      data: AgentCohortData;
    }
  | {
      status: 'error';
      error: string;
    };

export async function fetchAgentCohortDetailData(
  cohortId: string,
  familySlugOrLegacyId: string
): Promise<AgentCohortDetailLoadResult> {
  const response = await fetch(`/api/cohorts/${cohortId}/models/${familySlugOrLegacyId}`);
  if (!response.ok) {
    if (response.status === 404) {
      const payload = await response.json() as { error?: string };
      return {
        status: 'error',
        error: payload.error || 'Not found'
      };
    }

    return {
      status: 'error',
      error: 'Failed to load data'
    };
  }

  return {
    status: 'ok',
    data: await response.json() as AgentCohortData
  };
}
