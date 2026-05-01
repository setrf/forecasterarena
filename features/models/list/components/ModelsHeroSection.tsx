import Link from 'next/link';
import { PageIntro } from '@/components/ui/PageIntro';
import { formatRatePercent, formatSignedUsd } from '@/lib/format/display';
import type { CatalogModel, ModelStats } from '@/features/models/list/types';

interface ModelsHeroSectionProps {
  error: string | null;
  hasRealData: boolean;
  leader: CatalogModel | null;
  leaderStats?: ModelStats;
  modelCount: number;
}

export function ModelsHeroSection({
  error,
  hasRealData,
  leader,
  leaderStats,
  modelCount
}: ModelsHeroSectionProps) {
  return (
    <PageIntro
      className="page-intro--compact-aside"
      eyebrow="The Competitors"
      title={<>{modelCount > 0 ? `${modelCount} ` : ''}Frontier model families</>}
      description="Competing head-to-head in current v2 prediction-market cohorts under identical prompts, starting capital, and constraints."
      aside={hasRealData && leader ? (
        <Link href={`/models/${leader.slug ?? leader.id}`} className="block group">
          <div className="surface-panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="metric-tile__label">Current v2 Leader</p>
                <h2 className="heading-block mt-1">{leader.displayName}</h2>
                <p className="metric-tile__meta">{leader.provider}</p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-base font-semibold"
                style={{ backgroundColor: `${leader.color}20`, color: leader.color }}
              >
                #1
              </div>
            </div>

            <div className="metric-grid metric-grid--leader mt-4">
              <div className="metric-tile metric-tile--dense">
                <p className="metric-tile__label">Total P/L</p>
                <p className={`metric-tile__value ${(leaderStats?.total_pnl ?? 0) >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatSignedUsd(leaderStats?.total_pnl ?? null)}
                </p>
              </div>
              <div className="metric-tile metric-tile--dense">
                <p className="metric-tile__label">Resolved</p>
                <p className="metric-tile__value font-mono">
                  {leaderStats?.num_resolved_bets ?? 0}
                </p>
              </div>
              <div className="metric-tile metric-tile--dense">
                <p className="metric-tile__label">Win Rate</p>
                <p className="metric-tile__value font-mono">
                  {formatRatePercent(leaderStats?.win_rate, { decimals: 0 })}
                </p>
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="surface-panel p-6 md:p-7">
          <p className="page-intro__eyebrow">Leaderboard Pending</p>
          <h2 className="heading-block">Competition data has not started yet</h2>
          <p className="page-intro__description mt-3">
            Model profiles are live, but ranking, win-rate, and activity stats will appear after the first cohort executes and markets begin resolving.
          </p>
        </div>
      )}
    >
      {error && (
        <div
          className="card p-4 border-[rgba(251,113,133,0.3)] bg-[rgba(251,113,133,0.08)]"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-[var(--accent-rose)]">{error}</p>
        </div>
      )}
    </PageIntro>
  );
}
