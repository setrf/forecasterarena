import type {
  AgentStats,
  Cohort,
  CohortStats,
  Decision,
  ReleaseChangeEvent
} from '@/features/cohorts/detail/types';

interface CohortDetailPayload {
  cohort: Cohort;
  agents: AgentStats[];
  stats: CohortStats | null;
  equity_curves: Record<string, Array<{ date: string; value: number }>>;
  release_changes: ReleaseChangeEvent[];
  recent_decisions: Decision[];
}

export type CohortDetailLoadResult =
  | {
      status: 'ok';
      data: {
        cohort: Cohort;
        agents: AgentStats[];
        stats: CohortStats | null;
        equityCurves: Record<string, Array<{ date: string; value: number }>>;
        releaseChanges: ReleaseChangeEvent[];
        decisions: Decision[];
      };
    }
  | {
      status: 'error';
      error: string;
    };

export async function fetchCohortDetailData(
  cohortId: string,
  signal?: AbortSignal
): Promise<CohortDetailLoadResult> {
  const response = await fetch(`/api/cohorts/${cohortId}`, { signal });
  if (!response.ok) {
    return {
      status: 'error',
      error: response.status === 404 ? 'Cohort not found' : 'Failed to load cohort'
    };
  }

  const payload = await response.json() as CohortDetailPayload;
  return {
    status: 'ok',
    data: {
      cohort: payload.cohort,
      agents: payload.agents,
        stats: payload.stats,
        equityCurves: payload.equity_curves,
        releaseChanges: payload.release_changes,
        decisions: payload.recent_decisions
      }
  };
}
