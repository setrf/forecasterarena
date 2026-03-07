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
      <Link href="/markets" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to markets
      </Link>

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
          {market.category && (
            <span className="text-sm text-[var(--text-muted)]">{market.category}</span>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-4">{market.question}</h1>
        {market.description && (
          <p className="text-[var(--text-secondary)] max-w-3xl">{market.description}</p>
        )}
      </div>
    </>
  );
}
