import { formatDisplayDate } from '@/lib/utils';
import { formatUsd } from '@/lib/format/display';
import type { MarketDetail } from '@/features/markets/detail/types';

interface MarketStatsGridProps {
  market: MarketDetail;
  positionsCount: number;
}

export function MarketStatsGrid({ market, positionsCount }: MarketStatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="stat-card">
        <div className="stat-value">{formatUsd(market.volume)}</div>
        <div className="stat-label">Volume</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{formatUsd(market.liquidity)}</div>
        <div className="stat-label">Liquidity</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{formatDisplayDate(market.close_date, { month: 'short', day: 'numeric' })}</div>
        <div className="stat-label">Close Date</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{positionsCount}</div>
        <div className="stat-label">Open Positions</div>
      </div>
    </div>
  );
}
