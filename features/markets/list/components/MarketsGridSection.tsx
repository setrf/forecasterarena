import type { MarketListItem } from '@/features/markets/list/types';
import { MarketCard } from '@/features/markets/list/components/MarketCard';

interface MarketsGridSectionProps {
  error: string | null;
  hasMore: boolean;
  loading: boolean;
  markets: MarketListItem[];
  total: number;
  onLoadMore: () => void;
  onRetry: () => void;
}

export function MarketsGridSection({
  error,
  hasMore,
  loading,
  markets,
  total,
  onLoadMore,
  onRetry
}: MarketsGridSectionProps) {
  return (
    <section className="container-wide mx-auto px-6 py-10">
      {error && markets.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--accent-rose)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-7.938 4h15.876c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L2.33 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-xl font-medium mb-2">Markets unavailable</p>
          <p className="text-[var(--text-muted)] mb-6">{error}</p>
          <button onClick={onRetry} className="btn btn-primary">
            Retry
          </button>
        </div>
      ) : loading && markets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[var(--text-muted)]">Loading markets...</p>
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl font-medium mb-2">No markets found</p>
          <p className="text-[var(--text-muted)] mb-6">Try adjusting your filters, clearing the search, or browsing all active markets.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={onRetry} className="btn btn-secondary">
              Refresh data
            </button>
            <a href="/methodology" className="btn btn-ghost">
              How markets are selected
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {markets.map((market, index) => (
              <MarketCard key={market.id} market={market} index={index} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-10 text-center">
              <button
                onClick={onLoadMore}
                disabled={loading}
                className="btn btn-secondary"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : (
                  'Load More Markets'
                )}
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            Showing {markets.length} of {total} markets
          </p>
        </>
      )}
    </section>
  );
}
