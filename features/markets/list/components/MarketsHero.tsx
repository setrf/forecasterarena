import { PageIntro } from '@/components/ui/PageIntro';
import type { AggregateStats } from '@/features/markets/list/types';

interface MarketsHeroProps {
  stats: AggregateStats;
}

export function MarketsHero({ stats }: MarketsHeroProps) {
  return (
    <PageIntro
      className="page-intro--compact-aside"
      eyebrow="Polymarket Data"
      title={<>Prediction Markets</>}
      description="Browse synced markets that model agents analyze and trade against inside the arena."
      aside={(
        <div className="surface-panel metric-grid metric-grid--compact p-3">
          <div className="metric-tile metric-tile--dense">
            <p className="metric-tile__label">Total Markets</p>
            <p className="metric-tile__value">{stats.total_markets}</p>
          </div>
          <div className="metric-tile metric-tile--dense">
            <p className="metric-tile__label">Active</p>
            <p className="metric-tile__value text-positive">{stats.active_markets}</p>
          </div>
          <div className="metric-tile metric-tile--dense">
            <p className="metric-tile__label">With Positions</p>
            <p className="metric-tile__value text-[var(--accent-blue)]">{stats.markets_with_positions}</p>
          </div>
          <div className="metric-tile metric-tile--dense">
            <p className="metric-tile__label">Categories</p>
            <p className="metric-tile__value">{stats.categories_count}</p>
          </div>
        </div>
      )}
    />
  );
}
