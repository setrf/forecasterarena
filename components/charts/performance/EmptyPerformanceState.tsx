'use client';

import { EMPTY_STATE_BAR_HEIGHTS } from '@/components/charts/performance/constants';

interface EmptyPerformanceStateProps {
  height: number;
}

export function EmptyPerformanceState({ height }: EmptyPerformanceStateProps) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl relative overflow-hidden"
      style={{ height }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-primary)]" />
      <div className="absolute inset-0 dot-grid opacity-30" />

      <div className="absolute inset-0 flex items-end px-12 pb-20 opacity-10">
        {EMPTY_STATE_BAR_HEIGHTS.map((heightPercent, index) => (
          <div
            key={index}
            className="flex-1 mx-1 rounded-t"
            style={{
              height: `${heightPercent}%`,
              background: 'linear-gradient(to top, var(--accent-gold), transparent)',
              animation: 'pulse 2s ease-in-out infinite',
              animationDelay: `${index * 200}ms`
            }}
          />
        ))}
      </div>

      <div className="relative text-center z-10">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center">
          <svg className="w-10 h-10 text-[var(--accent-gold)] opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <p className="text-xl font-medium text-[var(--text-secondary)] mb-2">Awaiting First Cohort</p>
        <p className="text-sm text-[var(--text-muted)]">Performance chart will appear once models begin trading</p>
      </div>
    </div>
  );
}
