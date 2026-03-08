import type { CatalogModel, ModelStats } from '@/features/models/list/types';

export function createStatsMap(entries?: ModelStats[]): Map<string, ModelStats> {
  const stats = new Map<string, ModelStats>();

  for (const entry of entries ?? []) {
    stats.set(entry.model_id, {
      model_id: entry.model_id,
      total_pnl: entry.total_pnl,
      avg_brier_score: entry.avg_brier_score,
      win_rate: entry.win_rate,
      num_resolved_bets: entry.num_resolved_bets
    });
  }

  return stats;
}

export function sortModelsByPnl(models: CatalogModel[], stats: Map<string, ModelStats>): CatalogModel[] {
  return [...models].sort((a, b) => {
    const pnlA = stats.get(a.id)?.total_pnl ?? 0;
    const pnlB = stats.get(b.id)?.total_pnl ?? 0;
    return pnlB - pnlA;
  });
}
