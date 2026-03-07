import {
  formatDecimal,
  formatRatePercent,
  formatSignedPercent,
  formatSignedUsd
} from '@/lib/format/display';

interface ModelStatsGridProps {
  avgBrier: number | null;
  avgPnlPercent: number;
  loading: boolean;
  numCohorts: number;
  totalPnl: number;
  winRate: number | null;
}

export function ModelStatsGrid({
  avgBrier,
  avgPnlPercent,
  loading,
  numCohorts,
  totalPnl,
  winRate
}: ModelStatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
      <div className="stat-card">
        <div className={`stat-value ${totalPnl >= 0 ? 'text-positive' : 'text-negative'}`}>
          {loading ? '...' : formatSignedUsd(totalPnl, { decimals: 2 })}
        </div>
        <div className="stat-label">Total P/L</div>
      </div>
      <div className="stat-card">
        <div className={`stat-value ${avgPnlPercent >= 0 ? 'text-positive' : 'text-negative'}`}>
          {loading ? '...' : formatSignedPercent(avgPnlPercent)}
        </div>
        <div className="stat-label">Avg Return</div>
      </div>
      <div className="stat-card">
        <div className="stat-value font-mono">
          {loading ? '...' : formatDecimal(avgBrier)}
        </div>
        <div className="stat-label">Avg Brier Score</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">
          {loading ? '...' : formatRatePercent(winRate)}
        </div>
        <div className="stat-label">Win Rate</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{loading ? '...' : numCohorts}</div>
        <div className="stat-label">Cohorts</div>
      </div>
    </div>
  );
}
