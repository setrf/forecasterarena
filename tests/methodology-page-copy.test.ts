import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import MethodologyPageContent from '@/features/methodology/MethodologyPageContent';

vi.mock('@/components/ui/PageIntro', () => ({
  PageIntro: ({
    eyebrow,
    title,
    description,
    actions
  }: {
    eyebrow: string;
    title: string;
    description: string;
    actions?: React.ReactNode;
  }) => React.createElement(
    'header',
    null,
    React.createElement('p', null, eyebrow),
    React.createElement('h1', null, title),
    React.createElement('p', null, description),
    actions
  )
}));

describe('methodology page copy', () => {
  it('presents v2 as reality-grounded portfolio-value evaluation', () => {
    const html = renderToStaticMarkup(React.createElement(MethodologyPageContent, { models: [] }));

    expect(html).toContain('LLM Evaluation Grounded in Reality');
    expect(html).toContain('Forecaster Arena is an LLM evaluation grounded in reality');
    expect(html).toContain('portfolio_value = cash + marked_position_value');
    expect(html).toContain('Paper portfolios make model');
    expect(html).toContain('Historical v1 Methodology');
    expect(html).not.toContain('Brier Score');
    expect(html).not.toContain('implied confidence');
    expect(html).not.toContain('calibration + returns');
  });
});
