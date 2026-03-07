'use client';

import { useCallback, useEffect, useState } from 'react';
import { MarketsFilters } from '@/features/markets/list/components/MarketsFilters';
import { MarketsGridSection } from '@/features/markets/list/components/MarketsGridSection';
import { MarketsHero } from '@/features/markets/list/components/MarketsHero';
import type {
  AggregateStats,
  MarketListItem,
  SortOption,
  StatusOption
} from '@/features/markets/list/types';

const EMPTY_STATS: AggregateStats = {
  total_markets: 0,
  active_markets: 0,
  markets_with_positions: 0,
  categories_count: 0
};

export default function MarketsPageClient() {
  const [markets, setMarkets] = useState<MarketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState<AggregateStats>(EMPTY_STATS);
  const [status, setStatus] = useState<StatusOption>('active');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('volume');
  const [cohortBets, setCohortBets] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchMarkets = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('status', status);
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      if (cohortBets) params.set('cohort_bets', 'true');
      params.set('sort', sort);
      params.set('limit', '50');
      params.set('offset', reset ? '0' : String(offset));

      const res = await fetch(`/api/markets?${params}`, { cache: 'no-store' });
      if (!res.ok) {
        setError('Failed to load markets. Please try again.');
        return;
      }

      const data = await res.json() as {
        markets: MarketListItem[];
        total: number;
        has_more: boolean;
        categories?: string[];
        stats?: AggregateStats;
      };

      if (reset) {
        setMarkets(data.markets);
        setOffset(50);
      } else {
        setMarkets((prev) => [...prev, ...data.markets]);
        setOffset((prev) => prev + 50);
      }

      setTotal(data.total);
      setHasMore(data.has_more);
      if (data.categories) setCategories(data.categories);
      if (data.stats) setStats(data.stats);
    } catch {
      setError('Failed to load markets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [category, cohortBets, offset, search, sort, status]);

  useEffect(() => {
    fetchMarkets(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, category, sort, cohortBets]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMarkets(true);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="min-h-screen">
      <MarketsHero stats={stats} />
      <MarketsFilters
        categories={categories}
        category={category}
        cohortBets={cohortBets}
        search={search}
        sort={sort}
        status={status}
        onCategoryChange={setCategory}
        onCohortBetsChange={setCohortBets}
        onSearchChange={setSearch}
        onSortChange={setSort}
        onStatusChange={setStatus}
      />
      <MarketsGridSection
        error={error}
        hasMore={hasMore}
        loading={loading}
        markets={markets}
        total={total}
        onLoadMore={() => fetchMarkets(false)}
        onRetry={() => fetchMarkets(true)}
      />
    </div>
  );
}
