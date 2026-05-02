import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DecisionReasoningModal } from '@/features/models/detail/components/DecisionReasoningModal';

describe('decision reasoning modal', () => {
  it('renders dialog semantics and accessible close controls', () => {
    const html = renderToStaticMarkup(
      <DecisionReasoningModal
        decision={{
          id: 'decision-1',
          cohort_number: 3,
          decision_week: 2,
          decision_timestamp: '2026-05-01T12:00:00.000Z',
          action: 'HOLD',
          reasoning: 'Accessible reasoning.'
        }}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="model-decision-reasoning-title"');
    expect(html).toContain('aria-label="Dismiss reasoning modal"');
    expect(html).toContain('>Close</button>');
  });
});
