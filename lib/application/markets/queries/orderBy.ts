import type { MarketSortOption } from '@/lib/application/markets/types';

export function getMarketsOrderBy(sort: MarketSortOption): string {
  switch (sort) {
    case 'close_date':
      return 'close_date ASC, id ASC';
    case 'created':
      return 'first_seen_at DESC, id ASC';
    case 'volume':
    default:
      return 'volume DESC NULLS LAST, id ASC';
  }
}
