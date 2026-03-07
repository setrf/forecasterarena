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
