import { formatRelativeTime } from '@/lib/utils';
import type { DecisionFeedDecision } from '@/components/decision-feed/types';
import { getDecisionActionStyle, hasDecisionReasoning } from '@/components/decision-feed/utils';

interface DecisionFeedContentProps {
  decisions: DecisionFeedDecision[];
  expandedId: string | null;
  showCohort: boolean;
  className: string;
  onToggleExpanded: (id: string) => void;
}

export function DecisionFeedContent({
  decisions,
  expandedId,
  showCohort,
  className,
  onToggleExpanded
}: DecisionFeedContentProps) {
  if (decisions.length === 0) {
    return (
      <div className={`text-center py-8 text-[var(--text-muted)] ${className}`}>
        <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-sm">No decisions yet</p>
        <p className="text-xs mt-1">Latest eligible cohorts receive decisions every Sunday</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {decisions.map((decision) => {
        const actionStyle = getDecisionActionStyle(decision.action);
        const isExpanded = expandedId === decision.id;
        const hasReasoning = hasDecisionReasoning(decision.reasoning);
        const reasoningId = `decision-reasoning-${decision.id}`;

        return (
          <div
            key={decision.id}
            className={`p-4 bg-[var(--bg-tertiary)] rounded-lg transition-colors ${hasReasoning ? 'cursor-pointer hover:bg-[var(--bg-secondary)]' : ''}`}
            onClick={() => hasReasoning && onToggleExpanded(decision.id)}
            onKeyDown={(event) => {
              if (!hasReasoning) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onToggleExpanded(decision.id);
              }
            }}
            role={hasReasoning ? 'button' : undefined}
            tabIndex={hasReasoning ? 0 : undefined}
            aria-expanded={hasReasoning ? isExpanded : undefined}
            aria-controls={hasReasoning ? reasoningId : undefined}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: decision.model_color }}
                />
                <span className="font-medium text-sm">{decision.model_display_name}</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${actionStyle.bg} ${actionStyle.text}`}>
                  {decision.action}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">
                  {formatRelativeTime(decision.decision_timestamp)}
                </span>
                {hasReasoning && (
                  <svg
                    className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-2">
              {showCohort && (
                <span>Cohort #{decision.cohort_number}</span>
              )}
              <span>Week {decision.decision_week}</span>
            </div>

            {hasReasoning && (
              <div className="mt-2">
                {!isExpanded ? (
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                    {decision.reasoning}
                  </p>
                ) : (
                  <div
                    id={reasoningId}
                    className="bg-[var(--bg-primary)] rounded-lg p-3 border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-[var(--accent-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="text-xs font-medium text-[var(--text-secondary)]">Model Reasoning</span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                      {decision.reasoning}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!hasReasoning && (
              <p className="text-sm text-[var(--text-muted)]">No reasoning provided</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
