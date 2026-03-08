export interface LeaderboardEntry {
  model_id: string;
  model_slug?: string;
  family_slug?: string | null;
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

export function createEmptyLeaderboard(models: CatalogModel[]): LeaderboardEntry[] {
  return models.map((model) => ({
    model_id: model.slug ?? model.id,
    model_slug: model.slug ?? model.id,
    family_slug: model.slug ?? model.family_id ?? model.id,
    family_id: model.family_id ?? null,
    legacy_model_id: model.legacy_model_id ?? null,
    display_name: model.displayName,
    provider: model.provider,
    color: model.color,
    total_pnl: 0,
    total_pnl_percent: 0,
    avg_brier_score: null,
    num_cohorts: 0,
    num_resolved_bets: 0,
    win_rate: null
  }));
}
