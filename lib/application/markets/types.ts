import { getMarketById } from '@/lib/db/queries';

export type MarketSortOption = 'volume' | 'close_date' | 'created';

export interface ListMarketsInput {
  status: string;
  category?: string | null;
  search?: string | null;
  sort: MarketSortOption;
  withCohortBets: boolean;
  limit: number;
  offset: number;
}

export interface ListMarketsResult {
  markets: Array<Record<string, unknown>>;
  total: number;
  has_more: boolean;
  categories: string[];
  stats: {
    total_markets: number;
    active_markets: number;
    markets_with_positions: number;
    categories_count: number;
  };
  updated_at: string;
}

export type MarketDetailResult =
  | {
      status: 'ok';
      data: {
        market: NonNullable<ReturnType<typeof getMarketById>>;
        positions: Array<Record<string, unknown>>;
        trades: Array<Record<string, unknown>>;
        brier_scores: Array<Record<string, unknown>>;
        updated_at: string;
      };
    }
  | {
      status: 'not_found';
      error: 'Market not found';
    };
