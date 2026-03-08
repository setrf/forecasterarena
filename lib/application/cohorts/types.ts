import {
  getClosedPositionsWithMarkets,
  getCohortById,
  getPositionsWithMarkets
} from '@/lib/db/queries';

export interface CohortDetailPayload {
  cohort: ReturnType<typeof getCohortById>;
  agents: Array<{
    id: string;
    model_id: string;
    family_slug?: string | null;
    model_slug?: string;
    legacy_model_id?: string | null;
    family_id?: string | null;
    release_id?: string | null;
    benchmark_config_model_id?: string | null;
    model_display_name: string;
    model_color: string | null;
    model_release_name?: string;
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
  }>;
  stats: {
    week_number: number;
    total_trades: number;
    total_positions_open: number;
    markets_with_positions: number;
    avg_brier_score: number | null;
  };
  equity_curves: Record<string, Array<{ date: string; value: number }>>;
  recent_decisions: Array<Record<string, unknown>>;
  updated_at: string;
}

export interface AgentCohortDetailPayload {
  cohort: {
    id: string;
    cohort_number: number;
    status: string;
    started_at: string;
    completed_at: string | null;
    benchmark_config_id: string | null;
    current_week: number;
    total_markets: number;
  };
  model: {
    id: string;
    family_id?: string;
    family_slug?: string;
    slug?: string;
    legacy_model_id?: string | null;
    display_name: string;
    provider: string;
    color: string | null;
    release_id?: string;
    release_name?: string;
    benchmark_config_model_id?: string | null;
  };
  agent: {
    id: string;
    model_id?: string;
    family_slug?: string | null;
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
  };
  stats: {
    position_count: number;
    trade_count: number;
    win_rate: number | null;
    cohort_avg_pnl_percent: number;
    cohort_best_pnl_percent: number;
    cohort_worst_pnl_percent: number;
  };
  equity_curve: Array<{ date: string; value: number }>;
  decisions: Array<Record<string, unknown>>;
  positions: ReturnType<typeof getPositionsWithMarkets>;
  closed_positions: ReturnType<typeof getClosedPositionsWithMarkets>;
  trades: Array<Record<string, unknown>>;
  updated_at: string;
}

export type CohortNotFoundResult = {
  status: 'not_found';
  error: 'Cohort not found';
};

export type AgentCohortNotFoundResult =
  | { status: 'not_found'; error: 'Cohort not found' }
  | { status: 'not_found'; error: 'Model not found' }
  | { status: 'not_found'; error: 'Agent not found in this cohort' };

export type OkResult<T> = {
  status: 'ok';
  data: T;
};
