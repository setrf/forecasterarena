import type { Decision, Trade } from '@/features/decisions/detail/types';

interface DecisionDetailPayload {
  decision: Decision;
  trades?: Trade[];
}

export type DecisionDetailLoadResult =
  | {
      status: 'ok';
      data: {
        decision: Decision;
        trades: Trade[];
      };
    }
  | {
      status: 'error';
      error: string;
    };

export async function fetchDecisionDetailData(
  decisionId: string,
  signal?: AbortSignal
): Promise<DecisionDetailLoadResult> {
  const response = await fetch(`/api/decisions/${decisionId}`, { signal });
  if (!response.ok) {
    return {
      status: 'error',
      error: response.status === 404 ? 'Decision not found' : 'Failed to load decision'
    };
  }

  const payload = await response.json() as DecisionDetailPayload;
  return {
    status: 'ok',
    data: {
      decision: payload.decision,
      trades: payload.trades || []
    }
  };
}
