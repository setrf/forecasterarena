import Link from 'next/link';
import {
  formatDecimal,
  formatRatePercent,
  formatSignedUsd
} from '@/lib/format/display';
import type { CatalogModel, ModelStats } from '@/features/models/list/types';

interface ModelCardProps {
  animationDelayMs: number;
  hasRealData: boolean;
  loading: boolean;
  model: CatalogModel;
  modelStats?: ModelStats;
  rank: number;
}

export function ModelCard({
  animationDelayMs,
  hasRealData,
  loading,
  model,
  modelStats,
  rank
}: ModelCardProps) {
  const pnl = modelStats?.total_pnl ?? 0;
  const brier = modelStats?.avg_brier_score;
  const winRate = modelStats?.win_rate;

  return (
    <Link
      href={`/models/${model.slug ?? model.id}`}
      className="card p-6 group animate-fade-in"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg relative overflow-hidden"
            style={{
              backgroundColor: `${model.color}15`,
              color: model.color
            }}
          >
            <span className="relative z-10">{model.displayName.substring(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <h3 className="heading-card group-hover:text-[var(--accent-gold)] transition-colors">
              {model.displayName}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">{model.provider}</p>
          </div>
        </div>
        <span className="font-mono text-lg text-[var(--text-muted)]">#{rank}</span>
      </div>

      <div className="mb-5">
        <div className="h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          {hasRealData && (
            <div
              className={`h-full rounded-full ${pnl >= 0 ? 'bg-[var(--color-positive)]' : 'bg-[var(--color-negative)]'}`}
              style={{ width: `${Math.min(Math.abs(pnl) / 30, 100)}%` }}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="col-span-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 sm:col-span-1">
          <p className="text-xs text-[var(--text-muted)] mb-1">P/L</p>
          <p className={`text-lg font-semibold ${!hasRealData ? 'text-[var(--text-muted)]' : pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
            {loading ? '...' : hasRealData ? formatSignedUsd(pnl) : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">Brier</p>
          <p className="font-mono text-sm">
            {loading ? '...' : hasRealData ? formatDecimal(brier, { decimals: 3 }) : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">Win %</p>
          <p className="font-mono text-sm">
            {loading ? '...' : hasRealData ? formatRatePercent(winRate, { decimals: 0 }) : 'N/A'}
          </p>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <span className="text-sm text-[var(--text-muted)]">
          {modelStats?.num_resolved_bets ?? 0} resolved bets
        </span>
        <svg
          className="w-4 h-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>
    </Link>
  );
}
