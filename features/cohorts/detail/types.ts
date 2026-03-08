export interface Cohort {
  id: string;
  cohort_number: number;
  started_at: string;
  status: string;
  completed_at: string | null;
  methodology_version: string;
  benchmark_config_id?: string | null;
  initial_balance: number;
}

export interface AgentStats {
  id: string;
  model_id: string;
  model_slug?: string;
  legacy_model_id?: string | null;
  family_id?: string | null;
  release_id?: string | null;
  benchmark_config_model_id?: string | null;
  model_display_name: string;
  model_release_name?: string;
  model_color: string;
  cash_balance: number;
  total_invested: number;
  status: string;
  total_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  brier_score: number | null;
  position_count: number;
  trade_count: number;
  num_resolved_bets: number;
}

export interface CohortStats {
  week_number: number;
  total_trades: number;
  total_positions_open: number;
  markets_with_positions: number;
  avg_brier_score: number | null;
}

export interface Decision {
  id: string;
  agent_id: string;
  cohort_id: string;
  decision_week: number;
  decision_timestamp: string;
  action: string;
  reasoning: string | null;
  model_display_name: string;
  model_color: string;
  cohort_number?: number;
}
