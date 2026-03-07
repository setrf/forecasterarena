import { ModelCard } from '@/features/models/list/components/ModelCard';
import type { CatalogModel, ModelStats } from '@/features/models/list/types';

interface ModelsGridProps {
  hasRealData: boolean;
  loading: boolean;
  models: CatalogModel[];
  stats: Map<string, ModelStats>;
}

export function ModelsGrid({
  hasRealData,
  loading,
  models,
  stats
}: ModelsGridProps) {
  return (
    <section className="container-wide mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl">All Competitors</h2>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[var(--color-positive)]" />
          <span>All Active</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((model, index) => (
          <ModelCard
            key={model.id}
            animationDelayMs={index * 50}
            hasRealData={hasRealData}
            loading={loading}
            model={model}
            modelStats={stats.get(model.id)}
            rank={hasRealData ? index + 2 : index + 1}
          />
        ))}
      </div>
    </section>
  );
}
