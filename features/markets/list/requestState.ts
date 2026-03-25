import type {
  AggregateStats,
  MarketListItem,
  SortOption,
  StatusOption
} from '@/features/markets/list/types';

export interface MarketsFiltersState {
  status: StatusOption;
  category: string;
  search: string;
  sort: SortOption;
  cohortBets: boolean;
}

export interface MarketsResponsePayload {
  markets: MarketListItem[];
  total: number;
  has_more: boolean;
  categories?: string[];
  stats?: AggregateStats;
}

export interface MarketsViewState {
  markets: MarketListItem[];
  categories: string[];
  total: number;
  hasMore: boolean;
  stats: AggregateStats;
  offset: number;
}

export interface MarketsRequestMeta {
  requestId: number;
  requestedOffset: number;
  reset: boolean;
}

export function buildMarketsSearchParams(
  filters: MarketsFiltersState,
  limit: number,
  offset: number
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('status', filters.status);
  if (filters.category) {
    params.set('category', filters.category);
  }
  if (filters.search) {
    params.set('search', filters.search);
  }
  if (filters.cohortBets) {
    params.set('cohort_bets', 'true');
  }
  params.set('sort', filters.sort);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return params;
}

export function createMarketsRequestMeta(
  currentRequestId: number,
  offset: number,
  reset: boolean
): MarketsRequestMeta {
  return {
    requestId: currentRequestId + 1,
    requestedOffset: reset ? 0 : offset,
    reset
  };
}

export function applyMarketsResponse(
  state: MarketsViewState,
  activeRequestId: number,
  request: MarketsRequestMeta,
  data: MarketsResponsePayload
): MarketsViewState | null {
  if (activeRequestId !== request.requestId) {
    return null;
  }

  const markets = request.reset
    ? data.markets
    : [...state.markets, ...data.markets];

  return {
    markets,
    categories: data.categories ?? state.categories,
    total: data.total,
    hasMore: data.has_more,
    stats: data.stats ?? state.stats,
    offset: request.requestedOffset + data.markets.length
  };
}
