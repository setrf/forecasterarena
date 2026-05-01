import type {
  Agent,
  BenchmarkConfigModel,
  CohortDecisionStatus,
  CohortScoringStatus,
  Market,
  Model,
  ModelFamily,
  ModelRelease,
  Position
} from '@/lib/types/entities';

export interface AgentBenchmarkModelIdentity {
  id: string;
  legacy_model_id: string;
  family_id: string;
  family_slug: string;
  display_name: string;
  family_display_name: string;
  short_display_name: string;
  release_id: string;
  release_name: string;
  release_slug: string;
  openrouter_id: string;
  provider: string;
  color: string | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  family: ModelFamily | null;
  release: ModelRelease | null;
  config_model: BenchmarkConfigModel | null;
}

/**
 * Derived and joined application types.
 */
export interface AgentWithModel extends Agent {
  model: AgentBenchmarkModelIdentity;
}

export interface PositionWithMarket extends Position {
  market_question: string;
  current_price: number | null;
  opening_decision_id: string | null;
}

export interface LeaderboardEntry {
  family_slug: string;
  family_id?: string | null;
  legacy_model_id?: string | null;
  display_name: string;
  provider: string;
  color: string;
  total_pnl: number;
  total_pnl_percent: number;
  avg_brier_score: number | null;
  num_cohorts: number;
  num_resolved_bets: number;
  win_rate: number | null;
}

export interface CohortSummary {
  id: string;
  cohort_number: number;
  started_at: string;
  status: 'active' | 'completed';
  num_agents: number;
  total_markets_traded: number;
  methodology_version: string;
  decision_eligible: boolean;
  decision_status: CohortDecisionStatus;
  is_archived: boolean;
  archived_at: string | null;
  archive_reason: string | null;
  scoring_status: CohortScoringStatus;
}
