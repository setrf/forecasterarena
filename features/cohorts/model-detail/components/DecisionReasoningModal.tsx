'use client';

import React, { useEffect, useRef } from 'react';
import { formatAgentCohortDate, getDecisionBadgeClass } from '@/features/cohorts/model-detail/utils';
import type { Decision } from '@/features/cohorts/model-detail/types';

interface DecisionReasoningModalProps {
  decision: Decision | null;
  onClose: () => void;
}

export function DecisionReasoningModal({
  decision,
  onClose
}: DecisionReasoningModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!decision) {
      return;
    }

    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [decision, onClose]);

  if (!decision) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cohort-decision-reasoning-title"
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
              <span className={`badge ${getDecisionBadgeClass(decision.action)}`}>
                {decision.action}
              </span>
              <span className="text-[var(--text-secondary)]">
                Week {decision.decision_week}
              </span>
            </div>
            <button
              ref={closeButtonRef}
              aria-label="Dismiss reasoning modal"
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            {formatAgentCohortDate(decision.decision_timestamp)}
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <h4 id="cohort-decision-reasoning-title" className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Reasoning
          </h4>
          {decision.reasoning ? (
            <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {decision.reasoning}
            </p>
          ) : (
            <p className="text-[var(--text-muted)]">No reasoning provided</p>
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
