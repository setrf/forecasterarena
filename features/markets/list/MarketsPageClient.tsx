'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MarketsFilters } from '@/features/markets/list/components/MarketsFilters';
import { MarketsGridSection } from '@/features/markets/list/components/MarketsGridSection';
import { MarketsHero } from '@/features/markets/list/components/MarketsHero';
import {
  applyMarketsResponse,
  buildMarketsSearchParams,
  createMarketsRequestMeta
} from '@/features/markets/list/requestState';
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
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMarkets = useCallback(async (reset = false) => {
    const request = createMarketsRequestMeta(requestIdRef.current, offset, reset);
    requestIdRef.current = request.requestId;
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoading(true);
      setError(null);

      const params = buildMarketsSearchParams({
        status,
        category,
        search,
        sort,
        cohortBets
      }, 50, request.requestedOffset);

      const res = await fetch(`/api/markets?${params}`, {
        cache: 'no-store',
        signal: abortController.signal
      });
      if (!res.ok) {
        if (abortController.signal.aborted || requestIdRef.current !== request.requestId) {
          return;
        }
        setError('Failed to load markets. Please try again.');
        if (reset) {
          setMarkets([]);
          setTotal(0);
          setHasMore(false);
        }
        return;
      }

      const data = await res.json() as Awaited<ReturnType<Response['json']>> & {
        markets: MarketListItem[];
        total: number;
        has_more: boolean;
        categories?: string[];
        stats?: AggregateStats;
      };
      const nextState = applyMarketsResponse({
        markets,
        categories,
        total,
        hasMore,
        stats,
        offset
      }, requestIdRef.current, request, data);

      if (!nextState || abortController.signal.aborted) {
        return;
      }

      setMarkets(nextState.markets);
      setCategories(nextState.categories);
      setTotal(nextState.total);
      setHasMore(nextState.hasMore);
      setStats(nextState.stats);
      setOffset(nextState.offset);
    } catch {
      if (abortController.signal.aborted || requestIdRef.current !== request.requestId) {
        return;
      }

      setError('Failed to load markets. Please try again.');
      if (reset) {
        setMarkets([]);
        setTotal(0);
        setHasMore(false);
      }
    } finally {
      if (abortController.signal.aborted || requestIdRef.current !== request.requestId) {
        return;
      }
      setLoading(false);
    }
  }, [category, categories, cohortBets, hasMore, markets, offset, search, sort, stats, status, total]);

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

  useEffect(() => () => {
    abortControllerRef.current?.abort();
  }, []);

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
