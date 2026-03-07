import { MODELS } from '@/lib/constants';

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
}

export interface EquityPoint {
  snapshot_timestamp: string;
  total_value: number;
  cohort_number: number;
}

export interface ModelDetailData {
  model: {
    id: string;
    display_name: string;
    provider: string;
    color: string;
  };
  num_cohorts: number;
  total_pnl: number;
  avg_pnl_percent: number;
  avg_brier_score: number | null;
  win_rate: number | null;
  cohort_performance: CohortPerformance[];
  recent_decisions: ModelDecision[];
  equity_curve: EquityPoint[];
}

export type CatalogModel = (typeof MODELS)[number];
