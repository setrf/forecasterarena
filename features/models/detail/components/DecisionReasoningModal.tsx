import { formatDisplayDate } from '@/lib/utils';
import type { ModelDecision } from '@/features/models/detail/types';

interface DecisionReasoningModalProps {
  decision: ModelDecision | null;
  onClose: () => void;
}

export function DecisionReasoningModal({
  decision,
  onClose
}: DecisionReasoningModalProps) {
  if (!decision) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-secondary)] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl border border-[var(--border-primary)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--border-primary)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`badge ${
                decision.action === 'BET' ? 'badge-active' :
                  decision.action === 'SELL' ? 'badge-pending' : ''
              }`}>
                {decision.action}
              </span>
              <span className="text-[var(--text-secondary)]">
                Cohort #{decision.cohort_number}, Week {decision.decision_week}
              </span>
              {decision.model_release_name && (
                <span className="text-sm text-[var(--text-muted)]">
                  {decision.model_release_name}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            {formatDisplayDate(decision.decision_timestamp)}
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <h4 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Reasoning
          </h4>
          {decision.reasoning ? (
            <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {decision.reasoning}
            </p>
          ) : (
            <p className="text-[var(--text-muted)] italic">No reasoning provided</p>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
