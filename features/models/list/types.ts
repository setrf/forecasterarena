import { MODELS } from '@/lib/constants';

export interface ModelStats {
  model_id: string;
  total_pnl: number;
  avg_brier_score: number | null;
  win_rate: number | null;
  num_resolved_bets: number;
}

export interface LeaderboardResponse {
  leaderboard?: ModelStats[];
  cohorts?: Array<{
    total_markets_traded?: number | null;
  }>;
}

export type CatalogModel = (typeof MODELS)[number];
