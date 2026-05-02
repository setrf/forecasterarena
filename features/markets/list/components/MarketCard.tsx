import Link from 'next/link';
import { formatProbabilityPercent } from '@/lib/format/display';
import type { MarketListItem } from '@/features/markets/list/types';
import { formatMarketCloseDate, formatMarketVolume } from '@/features/markets/list/utils';

interface MarketCardProps {
  market: MarketListItem;
  index: number;
}

export function MarketCard({ market, index }: MarketCardProps) {
  const yesPrice = market.current_price;
  const noPrice = yesPrice === null || yesPrice === undefined ? null : 1 - yesPrice;

  return (
    <Link
      href={`/markets/${market.id}`}
      className="card p-5 group animate-fade-in"
      style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {market.status === 'active' && (
            <span className="w-2 h-2 rounded-full bg-[var(--color-positive)]" />
          )}
          <span className="text-xs font-mono text-[var(--text-muted)] uppercase">
            {market.status}
          </span>
        </div>
        {market.positions_count > 0 && (
          <span className="text-xs px-2 py-1 rounded bg-[var(--accent-gold-dim)] text-[var(--accent-gold)]">
            {market.positions_count} position{market.positions_count > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <h3 className="heading-card mb-5 min-h-[4.2rem] line-clamp-3 group-hover:text-[var(--accent-gold)] transition-colors md:min-h-[2.75rem] md:line-clamp-2">
        {market.question}
      </h3>

      <div className="space-y-3 mb-5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono w-8 text-[var(--color-positive)]">YES</span>
          <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-positive)] to-[#00ff9d]"
              style={{ width: `${(yesPrice ?? 0) * 100}%` }}
            />
          </div>
          <span className="text-sm font-mono w-12 text-right">{formatProbabilityPercent(yesPrice)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono w-8 text-[var(--color-negative)]">NO</span>
          <div className="flex-1 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-negative)] to-[#ff8a8a]"
              style={{ width: `${(noPrice ?? 0) * 100}%` }}
            />
          </div>
          <span className="text-sm font-mono w-12 text-right">{formatProbabilityPercent(noPrice)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
        <span className="px-2 py-1 rounded bg-[var(--bg-tertiary)]">
          {market.category || 'General'}
        </span>
        <span className="font-mono">{formatMarketVolume(market.volume)}</span>
        <span>{formatMarketCloseDate(market.close_date)}</span>
      </div>
    </Link>
  );
}
