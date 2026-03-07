import { MODELS } from '@/lib/constants';

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

export const emptyLeaderboard: LeaderboardEntry[] = MODELS.map((model) => ({
  model_id: model.id,
  display_name: model.displayName,
  provider: model.provider,
  color: model.color,
  total_pnl: 0,
  total_pnl_percent: 0,
  avg_brier_score: null,
  num_cohorts: 0,
  num_resolved_bets: 0,
  win_rate: null,
}));
