import Link from 'next/link';
import { formatSignedUsd, formatUsd } from '@/lib/format/display';
import type { CohortPerformance } from '@/features/models/detail/types';

interface ModelCohortPerformancePanelProps {
  cohorts: CohortPerformance[];
  loading: boolean;
  familySlug: string;
  title?: string;
  emptyTitle?: string;
  description?: string;
}

export function ModelCohortPerformancePanel({
  cohorts,
  loading,
  familySlug,
  title = 'Cohort Performance',
  emptyTitle = 'No cohort data yet',
  description
}: ModelCohortPerformancePanelProps) {
  return (
    <div className="glass-card p-6">
      <div className="mb-4">
        <h3 className="heading-card">{title}</h3>
        {description && (
          <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-[var(--text-muted)]">Loading...</div>
      ) : cohorts.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <p>{emptyTitle}</p>
          <p className="text-sm mt-2">Check back after the first cohort starts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cohorts.map((cohort) => (
            <Link
              key={cohort.cohort_number}
              href={`/cohorts/${cohort.cohort_id}/models/${familySlug}`}
              className="block p-4 bg-[var(--bg-tertiary)] rounded-lg cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors"
              title={`View detailed performance in Cohort #${cohort.cohort_number}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Cohort #{cohort.cohort_number}</span>
                <span className={`badge ${cohort.is_archived ? 'badge-archived' : cohort.cohort_status === 'active' ? 'badge-active' : 'badge-completed'}`}>
                  {cohort.is_archived ? 'Archived v1' : cohort.cohort_status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-[var(--text-muted)]">Value</p>
                  <p className="font-mono">{formatUsd(cohort.total_value, { decimals: 2 })}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">P/L</p>
                  <p className={`font-mono ${cohort.total_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {formatSignedUsd(cohort.total_pnl, { decimals: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Resolved</p>
                  <p className="font-mono">{cohort.num_resolved_bets}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
