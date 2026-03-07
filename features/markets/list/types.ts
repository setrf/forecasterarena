export interface MarketListItem {
  id: string;
  polymarket_id: string;
  question: string;
  category: string | null;
  market_type: string;
  current_price: number | null;
  volume: number | null;
  close_date: string;
  status: string;
  positions_count: number;
}

export interface AggregateStats {
  total_markets: number;
  active_markets: number;
  markets_with_positions: number;
  categories_count: number;
}

export type SortOption = 'volume' | 'close_date' | 'created';
export type StatusOption = 'active' | 'closed' | 'resolved' | 'all';
