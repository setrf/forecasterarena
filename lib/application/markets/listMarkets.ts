import { getDb } from '@/lib/db';
import {
  buildListMarketsWhereClause,
  countListedMarkets,
  selectListedMarkets,
  selectMarketCategories,
  selectMarketStats
} from '@/lib/application/markets/queries';
import type { ListMarketsInput, ListMarketsResult } from '@/lib/application/markets/types';

export function listMarkets({
  status,
  category,
  search,
  sort,
  withCohortBets,
  limit,
  offset
}: ListMarketsInput): ListMarketsResult {
  const db = getDb();
  const { whereClause, params } = buildListMarketsWhereClause({
    status,
    category,
    search,
    withCohortBets
  });
  const total = countListedMarkets(db, whereClause, params);
  const markets = selectListedMarkets(db, whereClause, params, sort, limit, offset);
  const categories = selectMarketCategories(db);
  const stats = selectMarketStats(db);

  return {
    markets,
    total,
    has_more: offset + limit < total,
    categories,
    stats: {
      total_markets: stats.total_markets,
      active_markets: stats.active_markets,
      markets_with_positions: stats.markets_with_positions,
      categories_count: categories.length
    },
    updated_at: new Date().toISOString()
  };
}
