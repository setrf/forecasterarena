import { formatDisplayDate } from '@/lib/utils';
import type { ModelDecision } from '@/features/models/detail/types';

interface ModelRecentDecisionsPanelProps {
  decisions: ModelDecision[];
  loading: boolean;
  onSelectDecision: (decision: ModelDecision) => void;
}

export function ModelRecentDecisionsPanel({
  decisions,
  loading,
  onSelectDecision
}: ModelRecentDecisionsPanelProps) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Decisions</h3>

      {loading ? (
        <div className="text-center py-8 text-[var(--text-muted)]">Loading...</div>
      ) : decisions.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <p>No decisions yet</p>
          <p className="text-sm mt-2">Decisions are made every Sunday at 00:00 UTC</p>
        </div>
      ) : (
        <div className="space-y-3">
          {decisions.slice(0, 5).map((decision) => (
            <button
              key={decision.id}
              onClick={() => onSelectDecision(decision)}
              className="w-full text-left p-4 bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`badge ${
                    decision.action === 'BET' ? 'badge-active' :
                      decision.action === 'SELL' ? 'badge-pending' : ''
                  }`}>
                    {decision.action}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">
                    Cohort #{decision.cohort_number}, Week {decision.decision_week}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text-muted)]">
                    {formatDisplayDate(decision.decision_timestamp)}
                  </span>
                  <svg
                    className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              {decision.reasoning && (
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                  {decision.reasoning}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
