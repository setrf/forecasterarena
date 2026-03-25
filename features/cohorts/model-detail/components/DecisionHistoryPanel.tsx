import { formatUsd } from '@/lib/format/display';
import type { Decision } from '@/features/cohorts/model-detail/types';
import {
  formatAgentCohortDate,
  getDecisionBadgeClass,
  shouldShowDecisionReasoning
} from '@/features/cohorts/model-detail/utils';

interface DecisionHistoryPanelProps {
  decisions: Decision[];
  onSelectDecision: (decision: Decision) => void;
}

export function DecisionHistoryPanel({
  decisions,
  onSelectDecision
}: DecisionHistoryPanelProps) {
  return (
    <div className="glass-card p-6 mb-8">
      <h2 className="heading-block mb-4">
        Decision History ({decisions.length})
      </h2>

      {decisions.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-8">
          No decisions yet. Decisions are made every Sunday at 00:00 UTC.
        </p>
      ) : (
        <div className="space-y-4">
          {decisions.map((decision) => (
            <div
              key={decision.id}
              className="p-4 bg-[var(--bg-tertiary)] rounded-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`badge ${getDecisionBadgeClass(decision.action)}`}>
                    {decision.action}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">
                    Week {decision.decision_week}
                  </span>
                </div>
                <span className="text-sm text-[var(--text-muted)]">
                  {formatAgentCohortDate(decision.decision_timestamp)}
                </span>
              </div>

              {decision.markets.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium mb-2">
                    {decision.action === 'BET' ? 'Markets Traded:' : 'Markets:'}
                  </p>
                  <div className="space-y-1">
                    {decision.markets.map((market, index) => (
                      <div key={`${decision.id}-${index}`} className="text-sm flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">
                          • {market.market_question}
                        </span>
                        <span className="font-mono text-[var(--text-muted)]">
                          {market.side} - {formatUsd(market.total_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {decision.reasoning && (
                <div>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                    {decision.reasoning}
                  </p>
                  {shouldShowDecisionReasoning(decision) && (
                    <button
                      onClick={() => onSelectDecision(decision)}
                      className="text-sm text-[var(--accent-blue)] hover:underline mt-2"
                    >
                      View Full Reasoning →
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
