export interface CohortPerformance {
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
}

export interface ModelDecision {
  id: string;
  cohort_number: number;
  decision_week: number;
  decision_timestamp: string;
  action: string;
  reasoning: string | null;
  model_release_id?: string | null;
  model_release_name?: string | null;
}

export interface ReleaseChangeEvent {
  date: string;
  model_id: string;
  model_name: string;
  previous_release_name: string;
  release_name: string;
  color: string;
}

export interface EquityPoint {
  snapshot_timestamp: string;
  total_value: number;
  cohort_number: number;
}

export interface ModelDetailData {
  model: {
    id: string;
    family_id?: string;
    slug?: string;
    legacy_model_id?: string | null;
    display_name: string;
    short_display_name?: string;
    provider: string;
    color: string;
    current_release_id?: string | null;
    current_release_name?: string | null;
    openrouter_id?: string | null;
  };
  num_cohorts: number;
  total_pnl: number;
  avg_pnl_percent: number;
  avg_brier_score: number | null;
  win_rate: number | null;
  cohort_performance: CohortPerformance[];
  recent_decisions: ModelDecision[];
  equity_curve: EquityPoint[];
  release_changes: ReleaseChangeEvent[];
}

export interface CatalogModel {
  id: string;
  family_id?: string;
  slug?: string;
  legacy_model_id?: string | null;
  displayName: string;
  shortDisplayName?: string;
  provider: string;
  color: string;
  openrouterId?: string | null;
  currentReleaseId?: string | null;
  currentReleaseName?: string | null;
}
