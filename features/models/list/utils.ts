import type { CatalogModel, ModelStats } from '@/features/models/list/types';

export function createStatsMap(entries?: ModelStats[]): Map<string, ModelStats> {
  const stats = new Map<string, ModelStats>();

  for (const entry of entries ?? []) {
    const canonicalId = entry.family_slug ?? entry.model_slug ?? entry.model_id;
    const normalizedEntry = {
      model_id: entry.model_id,
      family_slug: entry.family_slug ?? null,
      model_slug: entry.model_slug,
      family_id: entry.family_id ?? null,
      legacy_model_id: entry.legacy_model_id ?? null,
      total_pnl: entry.total_pnl,
      avg_brier_score: entry.avg_brier_score,
      win_rate: entry.win_rate,
      num_resolved_bets: entry.num_resolved_bets
    };

    stats.set(canonicalId, normalizedEntry);

    if (entry.model_id !== canonicalId) {
      stats.set(entry.model_id, normalizedEntry);
    }
  }

  return stats;
}

export function sortModelsByPnl(models: CatalogModel[], stats: Map<string, ModelStats>): CatalogModel[] {
  return [...models].sort((a, b) => {
    const keyA = a.slug ?? a.id;
    const keyB = b.slug ?? b.id;
    const pnlA = stats.get(keyA)?.total_pnl ?? stats.get(a.id)?.total_pnl ?? 0;
    const pnlB = stats.get(keyB)?.total_pnl ?? stats.get(b.id)?.total_pnl ?? 0;
    return pnlB - pnlA;
  });
}
