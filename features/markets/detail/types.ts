export interface MarketDetail {
  id: string;
  polymarket_id: string;
  slug: string | null;
  event_slug: string | null;
  question: string;
  description: string | null;
  category: string | null;
  market_type: string;
  current_price: number | null;
  volume: number | null;
  liquidity: number | null;
  close_date: string;
  status: string;
  resolution_outcome: string | null;
  resolved_at: string | null;
  first_seen_at: string;
  last_updated_at: string;
}

export interface MarketPosition {
  id: string;
  agent_id: string;
  family_slug: string;
  family_id?: string | null;
  release_id?: string | null;
  legacy_model_id?: string | null;
  model_display_name: string;
  model_color: string;
  side: string;
  shares: number;
  avg_entry_price: number;
  total_cost: number;
  current_value: number | null;
  unrealized_pnl: number | null;
  decision_id: string | null;
}

export interface MarketTrade {
  id: string;
  trade_type: string;
  side: string;
  shares: number;
  price: number;
  total_amount: number;
  executed_at: string;
  family_slug: string;
  family_id?: string | null;
  release_id?: string | null;
  legacy_model_id?: string | null;
  model_display_name: string;
  model_color: string;
  decision_id: string | null;
}

export interface MarketBrierScore {
  id: string;
  forecast_probability: number;
  actual_outcome: number;
  brier_score: number;
  family_slug: string;
  family_id?: string | null;
  release_id?: string | null;
  legacy_model_id?: string | null;
  model_display_name: string;
  model_color: string;
}
