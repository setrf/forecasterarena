import DecisionFeed from '@/components/DecisionFeed';
import type { Decision } from '@/features/cohorts/detail/types';

interface CohortRecentDecisionsPanelProps {
  decisions: Decision[];
}

export function CohortRecentDecisionsPanel({ decisions }: CohortRecentDecisionsPanelProps) {
  return (
    <div className="glass-card p-6">
      <h2 className="heading-block mb-4">Recent Decisions</h2>
      {decisions.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-8">
          No decisions yet. Decisions are made every Sunday at 00:00 UTC.
        </p>
      ) : (
        <DecisionFeed decisions={decisions} showCohort={false} />
      )}
    </div>
  );
}
