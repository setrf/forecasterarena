import { formatDecimal } from '@/lib/format/display';
import type { CohortStats } from '@/features/cohorts/detail/types';

interface CohortStatsGridProps {
  stats: CohortStats | null;
}

export function CohortStatsGrid({ stats }: CohortStatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <div className="stat-card">
        <div className="stat-value">Week {stats?.week_number ?? 1}</div>
        <div className="stat-label">Current Week</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats?.total_trades ?? 0}</div>
        <div className="stat-label">Total Trades</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats?.total_positions_open ?? 0}</div>
        <div className="stat-label">Open Positions</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats?.markets_with_positions ?? 0}</div>
        <div className="stat-label">Markets</div>
      </div>
      <div className="stat-card">
        <div className="stat-value font-mono">
          {formatDecimal(stats?.avg_brier_score)}
        </div>
        <div className="stat-label">Avg Brier</div>
      </div>
    </div>
  );
}
