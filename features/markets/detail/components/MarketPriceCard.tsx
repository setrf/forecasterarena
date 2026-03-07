import { formatDisplayDateTime } from '@/lib/utils';
import { formatProbabilityPercent } from '@/lib/format/display';
import type { MarketDetail } from '@/features/markets/detail/types';

interface MarketPriceCardProps {
  market: MarketDetail;
}

export function MarketPriceCard({ market }: MarketPriceCardProps) {
  if (market.status === 'resolved') {
    return (
      <div className="glass-card p-6 mb-8">
        <div className="text-center">
          <p className="text-[var(--text-muted)] mb-2">Resolved Outcome</p>
          <p className={`text-4xl font-bold ${market.resolution_outcome === 'YES' ? 'text-positive' : 'text-negative'}`}>
            {market.resolution_outcome}
          </p>
          {market.resolved_at && (
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Resolved on {formatDisplayDateTime(market.resolved_at)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-[var(--accent-emerald)]">
            {formatProbabilityPercent(market.current_price)}
          </p>
          <p className="text-sm text-[var(--text-muted)]">YES</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-[var(--accent-rose)]">
            {formatProbabilityPercent(market.current_price === null ? null : 1 - market.current_price)}
          </p>
          <p className="text-sm text-[var(--text-muted)]">NO</p>
        </div>
      </div>
      <div className="h-4 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--accent-emerald)] to-[var(--accent-blue)]"
          style={{ width: `${(market.current_price ?? 0.5) * 100}%` }}
        />
      </div>
    </div>
  );
}
