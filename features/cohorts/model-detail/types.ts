export interface Cohort {
  id: string;
  cohort_number: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  benchmark_config_id?: string | null;
  current_week: number;
  total_markets: number;
}

export interface Model {
  id: string;
  family_id?: string;
  slug?: string;
  legacy_model_id?: string | null;
  display_name: string;
  provider: string;
  color: string;
  release_id?: string;
  release_name?: string;
  benchmark_config_model_id?: string | null;
}

export interface Agent {
  id: string;
  model_id?: string;
  legacy_model_id?: string | null;
  benchmark_config_model_id?: string | null;
  status: string;
  cash_balance: number;
  total_invested: number;
  total_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  brier_score: number | null;
  num_resolved_bets: number;
  rank: number;
  total_agents: number;
}

export interface Stats {
  position_count: number;
  trade_count: number;
  win_rate: number | null;
  cohort_avg_pnl_percent: number;
  cohort_best_pnl_percent: number;
  cohort_worst_pnl_percent: number;
}

export interface EquityPoint {
  date: string;
  value: number;
}

export interface Market {
  trade_type?: string;
  side: string;
  shares: number;
  price: number;
  total_amount: number;
  market_id: string;
  market_question: string;
}

export interface Decision {
  id: string;
  decision_week: number;
  decision_timestamp: string;
  action: string;
  reasoning: string | null;
  markets: Market[];
}

export interface Position {
  id: string;
  market_id: string;
  market_question: string;
  side: string;
  shares: number;
  avg_entry_price: number;
  current_price: number;
  current_value?: number;
  unrealized_pnl?: number;
  status: string;
  opening_decision_id?: string;
}

export interface ClosedPosition {
  id: string;
  market_id: string;
  market_question: string;
  side: string;
  shares: number;
  avg_entry_price: number;
  total_cost: number;
  position_status: string;
  market_status: string;
  resolution_outcome: string | null;
  outcome: 'WON' | 'LOST' | 'EXITED' | 'CANCELLED' | 'PENDING' | 'UNKNOWN';
  settlement_value: number | null;
  pnl: number | null;
  opened_at: string;
  closed_at: string | null;
  resolved_at: string | null;
  opening_decision_id?: string;
}

export interface Trade {
  id: string;
  timestamp: string;
  trade_type: string;
  market_id: string;
  market_question: string;
  side: string;
  shares: number;
  price: number;
  total_amount: number;
  decision_week: number;
  decision_id: string;
}

export interface AgentCohortData {
  cohort: Cohort;
  model: Model;
  agent: Agent;
  stats: Stats;
  equity_curve: EquityPoint[];
  decisions: Decision[];
  positions: Position[];
  closed_positions: ClosedPosition[];
  trades: Trade[];
}
