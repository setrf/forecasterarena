import DecisionFeed from '@/components/DecisionFeed';
import type { Decision } from '@/features/cohorts/detail/types';

interface CohortRecentDecisionsPanelProps {
  decisions: Decision[];
  decisionEligible: boolean;
}

export function CohortRecentDecisionsPanel({
  decisions,
  decisionEligible
}: CohortRecentDecisionsPanelProps) {
  return (
    <div className="glass-card p-6">
      <h2 className="heading-block mb-4">Recent Decisions</h2>
      {decisions.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-8">
          {decisionEligible
            ? 'No decisions yet. Latest eligible cohorts receive decisions every Sunday at 00:05 UTC.'
            : 'No decisions yet. This cohort is resolving outside the latest decision window.'}
        </p>
      ) : (
        <DecisionFeed decisions={decisions} showCohort={false} />
      )}
    </div>
  );
}
