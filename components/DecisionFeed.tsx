'use client';

import { DecisionFeedContent } from '@/components/decision-feed/DecisionFeedContent';
import { DecisionFeedLoading } from '@/components/decision-feed/DecisionFeedLoading';
import type { DecisionFeedProps } from '@/components/decision-feed/types';
import { useDecisionFeedData } from '@/components/decision-feed/useDecisionFeedData';

export default function DecisionFeed({
  limit = 10,
  showCohort = true,
  autoRefresh = false,
  className = '',
  decisions: initialDecisions
}: DecisionFeedProps) {
  const { decisions, loading, expandedId, toggleExpanded } = useDecisionFeedData({
    limit,
    autoRefresh,
    initialDecisions
  });

  if (loading) {
    return <DecisionFeedLoading className={className} />;
  }

  return (
    <DecisionFeedContent
      decisions={decisions}
      expandedId={expandedId}
      showCohort={showCohort}
      className={className}
      onToggleExpanded={toggleExpanded}
    />
  );
}

