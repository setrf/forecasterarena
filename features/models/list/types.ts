export interface ModelStats {
  family_slug: string;
  family_id?: string | null;
  legacy_model_id?: string | null;
  total_pnl: number;
  avg_brier_score: number | null;
  win_rate: number | null;
  num_resolved_bets: number;
}

export interface LeaderboardResponse {
  leaderboard?: ModelStats[];
  models?: CatalogModel[];
  cohorts?: Array<{
    total_markets_traded?: number | null;
  }>;
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
