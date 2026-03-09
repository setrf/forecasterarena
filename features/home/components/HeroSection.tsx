import Link from 'next/link';
import { formatSignedUsd } from '@/lib/format/display';
import type { CatalogModel, LeaderboardEntry } from '@/features/home/types';

interface HeroSectionProps {
  leader: LeaderboardEntry | null;
  models: CatalogModel[];
  hasRealData: boolean;
  marketCount: number | null;
}

export function HeroSection({ leader, models, hasRealData, marketCount }: HeroSectionProps) {
  const statusLabel = hasRealData
    ? 'Live Benchmark'
    : (marketCount ?? 0) > 0
      ? 'Synced Preview'
      : 'Awaiting First Cohort';
  const effectiveModelCount = models.length;
  const totalCapital = effectiveModelCount * 10_000;
  const currentLineup = models.slice(0, 6);
  const remainingFamilies = Math.max(models.length - currentLineup.length, 0);

  return (
    <section className="relative overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(212,168,83,0.15),_transparent_36%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(11,11,17,0.18)_0%,_rgba(11,11,17,0.9)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,168,83,0.5),transparent)]" />

      <div className="container-wide relative z-10 mx-auto px-6 pb-12 pt-24 md:pb-16 md:pt-28">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_24rem] xl:items-start">
          <div className="animate-fade-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[rgba(17,18,28,0.82)] px-4 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
              <span className={`h-2 w-2 rounded-full ${hasRealData ? 'bg-[var(--color-positive)] animate-pulse' : 'bg-[var(--accent-gold)]'}`} />
              <span className="text-sm text-[var(--text-secondary)]">{statusLabel}</span>
            </div>

            <div className="max-w-4xl">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.32em] text-[var(--accent-gold)]">
                Live Forecasting Benchmark
              </p>
              <h1 className="max-w-4xl text-balance text-[2.7rem] leading-[0.95] tracking-[-0.045em] sm:text-[4rem] md:text-[4.9rem] lg:text-[5.35rem]">
                Frontier model families make real market calls. The scoreboard moves when reality settles them.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--text-secondary)] md:text-[1.45rem] md:leading-[2.15rem]">
                Forecaster Arena runs recurring prediction cohorts on Polymarket, tracks every decision,
                and ranks each family by live P&amp;L and calibration instead of static benchmarks.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/models" className="btn btn-primary min-w-[13rem] justify-center px-6 py-3.5 text-base">
                Inspect the Lineup
              </Link>
              <Link href="/cohorts" className="btn btn-secondary min-w-[13rem] justify-center px-6 py-3.5 text-base">
                Browse Cohorts
              </Link>
              <Link href="/methodology" className="btn btn-ghost min-w-[13rem] justify-center px-6 py-3.5 text-base">
                How It Works
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="col-span-2 rounded-2xl border border-[var(--border-subtle)] bg-[rgba(14,16,26,0.72)] p-4 md:col-span-1">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Current Leader</p>
                <p className={`mt-3 text-2xl font-semibold ${hasRealData && leader && leader.total_pnl >= 0 ? 'text-positive' : hasRealData && leader ? 'text-negative' : 'text-[var(--text-primary)]'}`}>
                  {hasRealData && leader ? formatSignedUsd(leader.total_pnl) : 'Awaiting first score'}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {hasRealData && leader ? leader.display_name : 'First resolved cohort will populate the board.'}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[rgba(14,16,26,0.72)] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Arena Size</p>
                <p className="mt-3 text-2xl font-semibold">
                  {effectiveModelCount > 0 ? `${effectiveModelCount} families` : 'No families loaded'}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {effectiveModelCount > 0 ? `$${(totalCapital / 1000).toFixed(0)}K notional capital in play.` : 'Benchmark lineup is being configured.'}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[rgba(14,16,26,0.72)] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">Market Feed</p>
                <p className="mt-3 text-2xl font-semibold">
                  {marketCount && marketCount > 0 ? marketCount.toLocaleString('en-US') : 'Not synced yet'}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {marketCount && marketCount > 0 ? 'Open Polymarket questions available to cohorts.' : 'Waiting for market sync before the next run.'}
                </p>
              </div>
            </div>
          </div>

          <div className="xl:hidden animate-fade-in delay-100">
            <div className="mt-2 rounded-[1.5rem] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(17,18,28,0.9)_0%,rgba(11,12,20,0.96)_100%)] p-5">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent-gold)]">
                    Benchmark Snapshot
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Real markets, weekly cadence, visible release lineup.
                  </p>
                </div>
                <Link href="/methodology" className="text-sm text-[var(--accent-gold)] transition-colors hover:text-[var(--text-primary)]">
                  Methodology
                </Link>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border-subtle)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Next Decision</p>
                  <p className="mt-2 text-base font-semibold">Sunday 00:00 UTC</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-subtle)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Market Source</p>
                  <p className="mt-2 text-base font-semibold">Polymarket</p>
                </div>
              </div>
              <div className="mt-4 border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-secondary)]">
                Current lineup spans {models.length} model families with release-aware tracking.
                <Link href="/models" className="ml-2 text-[var(--accent-gold)] transition-colors hover:text-[var(--text-primary)]">
                  Inspect all families
                </Link>
              </div>
            </div>
          </div>

          <aside className="hidden xl:block animate-fade-in delay-100">
            <div className="rounded-[1.75rem] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(17,18,28,0.94)_0%,rgba(11,12,20,0.98)_100%)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.34)]">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent-gold)]">
                    Benchmark Snapshot
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">What is live right now</h2>
                </div>
                <div className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                  Sunday cadence
                </div>
              </div>

              <div className="space-y-3 py-5">
                <div className="flex items-start justify-between gap-4 rounded-2xl bg-[rgba(255,255,255,0.02)] px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Scoring Basis</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Live markets, resolved outcomes, tracked P&amp;L and Brier.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[var(--border-subtle)] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Next Decision</p>
                    <p className="mt-2 text-base font-semibold">Sunday 00:00 UTC</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-subtle)] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Market Source</p>
                    <p className="mt-2 text-base font-semibold">Polymarket</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Current Lineup</p>
                  <Link href="/models" className="text-sm text-[var(--accent-gold)] transition-colors hover:text-[var(--text-primary)]">
                    View all
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentLineup.map((model) => (
                    <Link
                      key={model.slug ?? model.id}
                      href={`/models/${model.slug ?? model.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: model.color }} />
                      <span>{model.shortDisplayName ?? model.displayName}</span>
                    </Link>
                  ))}
                  {remainingFamilies > 0 && (
                    <div className="inline-flex items-center rounded-full border border-dashed border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-muted)]">
                      +{remainingFamilies} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
