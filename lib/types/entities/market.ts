export interface Market {
  id: string;
  polymarket_id: string;
  slug: string | null;
  event_slug: string | null;
  question: string;
  description: string | null;
  category: string | null;
  market_type: 'binary' | 'multi_outcome';
  outcomes: string | null;
  close_date: string;
  status: 'active' | 'closed' | 'resolved' | 'cancelled';
  current_price: number | null;
  current_prices: string | null;
  clob_token_ids: string | null;
  volume: number | null;
  liquidity: number | null;
  resolution_outcome: string | null;
  resolved_at: string | null;
  first_seen_at: string;
  last_updated_at: string;
}
