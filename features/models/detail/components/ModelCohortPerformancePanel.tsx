import Link from 'next/link';
import {
  formatDecimal,
  formatSignedUsd,
  formatUsd
} from '@/lib/format/display';
import type { CohortPerformance } from '@/features/models/detail/types';

interface ModelCohortPerformancePanelProps {
  cohorts: CohortPerformance[];
  loading: boolean;
  modelId: string;
}

export function ModelCohortPerformancePanel({
  cohorts,
  loading,
  modelId
}: ModelCohortPerformancePanelProps) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4">Cohort Performance</h3>

      {loading ? (
        <div className="text-center py-8 text-[var(--text-muted)]">Loading...</div>
      ) : cohorts.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <p>No cohort data yet</p>
          <p className="text-sm mt-2">Check back after the first cohort starts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cohorts.map((cohort) => (
            <Link
              key={cohort.cohort_number}
              href={`/cohorts/${cohort.cohort_id}/models/${modelId}`}
              className="block p-4 bg-[var(--bg-tertiary)] rounded-lg cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors"
              title={`View detailed performance in Cohort #${cohort.cohort_number}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Cohort #{cohort.cohort_number}</span>
                <span className={`badge ${cohort.cohort_status === 'active' ? 'badge-active' : 'badge-completed'}`}>
                  {cohort.cohort_status}
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
                  <p className="text-[var(--text-muted)]">Brier</p>
                  <p className="font-mono">{formatDecimal(cohort.brier_score)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
