/**
 * Core persisted entities.
 */
export interface Cohort {
  id: string;
  cohort_number: number;
  started_at: string;
  status: 'active' | 'completed';
  completed_at: string | null;
  methodology_version: string;
  initial_balance: number;
  created_at: string;
}

export interface Model {
  id: string;
  openrouter_id: string;
  display_name: string;
  provider: string;
  color: string | null;
  is_active: number;
  added_at: string;
}

export interface Agent {
  id: string;
  cohort_id: string;
  model_id: string;
  cash_balance: number;
  total_invested: number;
  status: 'active' | 'bankrupt';
  created_at: string;
}

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
  volume: number | null;
  liquidity: number | null;
  resolution_outcome: string | null;
  resolved_at: string | null;
  first_seen_at: string;
  last_updated_at: string;
}

export interface Position {
  id: string;
  agent_id: string;
  market_id: string;
  side: string;
  shares: number;
  avg_entry_price: number;
  total_cost: number;
  current_value: number | null;
  unrealized_pnl: number | null;
  status: 'open' | 'closed' | 'settled';
  opened_at: string;
  closed_at: string | null;
}

export interface Trade {
  id: string;
  agent_id: string;
  market_id: string;
  position_id: string | null;
  decision_id: string | null;
  trade_type: 'BUY' | 'SELL';
  side: string;
  shares: number;
  price: number;
  total_amount: number;
  implied_confidence: number | null;
  cost_basis: number | null;
  realized_pnl: number | null;
  executed_at: string;
}

export interface Decision {
  id: string;
  agent_id: string;
  cohort_id: string;
  decision_week: number;
  decision_timestamp: string;
  prompt_system: string;
  prompt_user: string;
  raw_response: string | null;
  parsed_response: string | null;
  retry_count: number;
  action: 'BET' | 'SELL' | 'HOLD' | 'ERROR';
  reasoning: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  api_cost_usd: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface PortfolioSnapshot {
  id: string;
  agent_id: string;
  snapshot_timestamp: string;
  cash_balance: number;
  positions_value: number;
  total_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  brier_score: number | null;
  num_resolved_bets: number;
  created_at: string;
}

export interface BrierScoreRecord {
  id: string;
  agent_id: string;
  trade_id: string;
  market_id: string;
  forecast_probability: number;
  actual_outcome: number;
  brier_score: number;
  calculated_at: string;
}

export interface ApiCost {
  id: string;
  model_id: string;
  decision_id: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  recorded_at: string;
}

export interface MethodologyVersion {
  version: string;
  title: string;
  description: string;
  changes_summary: string | null;
  effective_from_cohort: number | null;
  document_hash: string | null;
  created_at: string;
}

export interface SystemLog {
  id: string;
  event_type: string;
  event_data: string | null;
  severity: 'info' | 'warning' | 'error';
  created_at: string;
}
