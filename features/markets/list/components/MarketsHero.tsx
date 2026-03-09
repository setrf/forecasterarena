import type { AggregateStats } from '@/features/markets/list/types';

interface MarketsHeroProps {
  stats: AggregateStats;
}

export function MarketsHero({ stats }: MarketsHeroProps) {
  return (
    <section className="relative border-b border-[var(--border-subtle)]">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)]" />
      <div className="container-wide mx-auto px-6 py-16 relative z-10">
        <p className="text-[var(--accent-gold)] font-mono text-sm tracking-wider mb-2">POLYMARKET DATA</p>
        <h1 className="text-4xl md:text-5xl mb-4">
          Prediction <span className="font-accent">Markets</span>
        </h1>
        <p className="text-[var(--text-secondary)] max-w-xl text-lg">
          Browse markets synced from Polymarket. LLM agents analyze these markets
          and make betting decisions.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          <div className="stat-card">
            <p className="text-3xl font-bold">{stats.total_markets}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Total Markets</p>
          </div>
          <div className="stat-card">
            <p className="text-3xl font-bold text-[var(--color-positive)]">{stats.active_markets}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Active</p>
          </div>
          <div className="stat-card">
            <p className="text-3xl font-bold text-[var(--accent-blue)]">{stats.markets_with_positions}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">With Positions</p>
          </div>
          <div className="stat-card">
            <p className="text-3xl font-bold">{stats.categories_count}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Categories</p>
          </div>
        </div>
      </div>
    </section>
  );
}
