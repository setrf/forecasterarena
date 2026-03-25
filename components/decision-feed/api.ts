import type { DecisionFeedDecision } from '@/components/decision-feed/types';

interface DecisionFeedResponse {
  decisions?: DecisionFeedDecision[];
}

export async function fetchRecentDecisions(
  limit: number,
  signal?: AbortSignal
): Promise<DecisionFeedDecision[]> {
  const response = await fetch(`/api/decisions/recent?limit=${limit}`, {
    cache: 'no-store',
    signal
  });

  if (!response.ok) {
    throw new Error('Failed to load recent decisions');
  }

  const data = await response.json() as DecisionFeedResponse;
  return data.decisions ?? [];
}
