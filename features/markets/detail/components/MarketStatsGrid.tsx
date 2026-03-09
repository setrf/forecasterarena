import { formatDisplayDate } from '@/lib/utils';
import { formatUsd } from '@/lib/format/display';
import type { MarketDetail } from '@/features/markets/detail/types';

interface MarketStatsGridProps {
  market: MarketDetail;
  positionsCount: number;
}

export function MarketStatsGrid({ market, positionsCount }: MarketStatsGridProps) {
  const statValueClassName = 'stat-value text-[1.35rem] leading-none tracking-[-0.06em] sm:text-[1.8rem] md:text-[2.5rem]';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="stat-card">
        <div className={statValueClassName}>{formatUsd(market.volume)}</div>
        <div className="stat-label">Volume</div>
      </div>
      <div className="stat-card">
        <div className={statValueClassName}>{formatUsd(market.liquidity)}</div>
        <div className="stat-label">Liquidity</div>
      </div>
      <div className="stat-card">
        <div className={statValueClassName}>{formatDisplayDate(market.close_date, { month: 'short', day: 'numeric' })}</div>
        <div className="stat-label">Close Date</div>
      </div>
      <div className="stat-card">
        <div className={statValueClassName}>{positionsCount}</div>
        <div className="stat-label">Open Positions</div>
      </div>
    </div>
  );
}
