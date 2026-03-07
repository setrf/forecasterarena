import type { MarketDetail } from '@/features/markets/detail/types';

interface MarketExternalLinkProps {
  market: MarketDetail;
}

export function MarketExternalLink({ market }: MarketExternalLinkProps) {
  const slug = market.event_slug || market.slug;

  if (!slug) {
    return null;
  }

  return (
    <div className="mt-8 text-center">
      <a
        href={`https://polymarket.com/event/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary"
      >
        View on Polymarket
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
}
