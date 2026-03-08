export interface AgentWithCohort {
  id: string;
  cohort_id: string;
  model_id: string;
  family_id: string | null;
  release_id: string | null;
  cash_balance: number;
  total_invested: number;
  status: string;
  created_at: string;
  cohort_number: number;
  cohort_started_at: string;
  cohort_status: string;
}

export interface ModelDetailIdentity {
  id: string;
  family_id: string;
  slug: string;
  legacy_model_id: string | null;
  display_name: string;
  short_display_name: string;
  provider: string;
  color: string | null;
  current_release_id: string | null;
  current_release_name: string | null;
}

export interface ModelDetailPayload {
  model: ModelDetailIdentity;
  num_cohorts: number;
  total_pnl: number;
  avg_pnl_percent: number;
  avg_brier_score: number | null;
  win_rate: number | null;
  cohort_performance: Array<{
    cohort_id: string;
    cohort_number: number;
    cohort_status: string;
    agent_status: string;
    cash_balance: number;
    total_value: number;
    total_pnl: number;
    total_pnl_percent: number;
    brier_score: number | null;
    num_resolved_bets: number;
  }>;
  recent_decisions: Array<Record<string, unknown>>;
  equity_curve: Array<{
    snapshot_timestamp: string;
    total_value: number;
  }>;
  updated_at: string;
}

export type ModelDetailNotFoundResult = {
  status: 'not_found';
  error: 'Model not found';
};

export type OkResult<T> = {
  status: 'ok';
  data: T;
};
