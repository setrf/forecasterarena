import Link from 'next/link';
import {
  formatDecimal,
  formatRatePercent,
  formatSignedUsd
} from '@/lib/format/display';
import type { CatalogModel, ModelStats } from '@/features/models/list/types';

interface ModelsHeroSectionProps {
  error: string | null;
  hasRealData: boolean;
  leader: CatalogModel | null;
  leaderStats?: ModelStats;
}

export function ModelsHeroSection({
  error,
  hasRealData,
  leader,
  leaderStats
}: ModelsHeroSectionProps) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--border-subtle)]">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)]" />
      <div className="absolute inset-0 dot-grid opacity-30" />

      <div className="container-wide mx-auto px-6 py-12 relative z-10">
        <div className="mb-6">
          <p className="text-[var(--accent-gold)] font-mono text-sm tracking-wider mb-2">THE COMPETITORS</p>
          <h1 className="text-4xl md:text-5xl mb-4">
            Seven <span className="font-serif-italic">Frontier</span> LLMs
          </h1>
          <p className="text-[var(--text-secondary)] max-w-xl text-lg">
            Competing head-to-head in prediction markets. Each model receives identical
            prompts, starting capital, and constraints.
          </p>
        </div>

        {error && (
          <div
            className="card p-4 border-[rgba(251,113,133,0.3)] bg-[rgba(251,113,133,0.08)]"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm text-[var(--accent-rose)]">{error}</p>
          </div>
        )}

        {hasRealData && leader ? (
          <Link href={`/models/${leader.id}`} className="block mt-10 group">
            <div className="card-featured p-8 md:p-10">
              <div className="flex flex-col md:flex-row md:items-center gap-8">
                <div className="flex items-center gap-6">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold"
                    style={{
                      backgroundColor: `${leader.color}20`,
                      color: leader.color,
                      boxShadow: `0 0 40px ${leader.color}30`
                    }}
                  >
                    #1
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--accent-gold)] mb-1">CURRENT LEADER</p>
                    <h2 className="text-3xl mb-1">{leader.displayName}</h2>
                    <p className="text-[var(--text-muted)]">{leader.provider}</p>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-3 gap-6 md:gap-8 md:pl-8 md:border-l border-[var(--border-subtle)]">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Total P/L</p>
                    <p
                      className={`text-2xl md:text-3xl font-bold ${(leaderStats?.total_pnl ?? 0) >= 0 ? 'text-positive' : 'text-negative'}`}
                    >
                      {formatSignedUsd(leaderStats?.total_pnl ?? null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Brier Score</p>
                    <p className="text-2xl md:text-3xl font-mono">
                      {formatDecimal(leaderStats?.avg_brier_score, { decimals: 3 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Win Rate</p>
                    <p className="text-2xl md:text-3xl font-mono">
                      {formatRatePercent(leaderStats?.win_rate, { decimals: 0 })}
                    </p>
                  </div>
                </div>

                <svg
                  className="w-6 h-6 text-[var(--text-muted)] transition-transform group-hover:translate-x-2 hidden md:block"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </Link>
        ) : (
          <div className="block mt-10">
            <div className="card p-8 md:p-10">
              <p className="text-xs font-mono text-[var(--accent-gold)] mb-3">LEADERBOARD PENDING</p>
              <h2 className="text-2xl mb-3">Competition data has not started yet</h2>
              <p className="text-[var(--text-secondary)] max-w-2xl">
                Model profiles are live, but ranking, Brier score, and win-rate stats will appear after the
                first cohort executes and markets begin resolving.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
