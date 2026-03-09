import Link from 'next/link';
import type { MarketDetail } from '@/features/markets/detail/types';

interface MarketDetailHeaderProps {
  market: MarketDetail;
  statusBadge: {
    className: string;
    label: string;
  };
}

export function MarketDetailHeader({ market, statusBadge }: MarketDetailHeaderProps) {
  return (
    <>
      <Link href="/markets" className="detail-backlink">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to markets
      </Link>

      <div className="detail-header">
        <div>
          <p className="detail-header__eyebrow">Market</p>
          <div className="detail-header__badges">
            <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
            {market.category && (
              <span className="text-sm text-[var(--text-muted)]">{market.category}</span>
            )}
          </div>
          <h1 className="detail-header__title mt-3 max-w-4xl">{market.question}</h1>
          {market.description && (
            <p className="detail-header__meta max-w-3xl">{market.description}</p>
          )}
        </div>
      </div>
    </>
  );
}
