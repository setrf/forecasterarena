import type { Agent, Market, Model, Position } from '@/lib/types/entities';

/**
 * Derived and joined application types.
 */
export interface AgentWithModel extends Agent {
  model: Model;
}

export interface PositionWithMarket extends Position {
  market_question: string;
  current_price: number | null;
  opening_decision_id: string | null;
}

export interface LeaderboardEntry {
  model_id: string;
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
}
