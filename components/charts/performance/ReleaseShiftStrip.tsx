'use client';

import { formatPerformanceDateShort } from '@/components/charts/performance/formatters';
import type { ReleaseChangeEvent } from '@/components/charts/performance/types';

interface ReleaseShiftStripProps {
  releaseChanges: ReleaseChangeEvent[];
}

export function ReleaseShiftStrip({ releaseChanges }: ReleaseShiftStripProps) {
  if (releaseChanges.length === 0) {
    return null;
  }

  const grouped = new Map<string, ReleaseChangeEvent[]>();
  for (const event of releaseChanges) {
    const current = grouped.get(event.date) ?? [];
    current.push(event);
    grouped.set(event.date, current);
  }

  return (
    <div className="mb-4 rounded-xl border border-[var(--border-subtle)] bg-[rgba(12,14,24,0.82)] px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--accent-gold)]">
          Version Shifts In View
        </span>
        <span className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {Array.from(grouped.entries()).map(([date, events]) => (
          <div
            key={date}
            className="min-w-fit rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2"
          >
            <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {formatPerformanceDateShort(date)}
            </div>
            <div className="flex flex-wrap gap-2">
              {events.map((event) => (
                <div
                  key={`${event.date}-${event.model_id}-${event.release_name}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border-medium)] bg-[var(--bg-tertiary)] px-2.5 py-1"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: event.color }} />
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {event.previous_release_name}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">to</span>
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {event.release_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
