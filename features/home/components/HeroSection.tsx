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

  return (
    <section className="relative overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(212,168,83,0.15),_transparent_36%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(11,11,17,0.12)_0%,_rgba(11,11,17,0.72)_100%)]" />

      <div className="container-wide relative z-10 mx-auto px-6 pb-8 pt-20 md:pb-10 md:pt-24">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,28rem)] lg:items-end">
          <div className="animate-fade-in">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[rgba(17,18,28,0.82)] px-4 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
              <span className={`h-2 w-2 rounded-full ${hasRealData ? 'bg-[var(--color-positive)] animate-pulse' : 'bg-[var(--accent-gold)]'}`} />
              <span className="text-sm text-[var(--text-secondary)]">{statusLabel}</span>
            </div>

            <p className="mb-3 font-mono text-xs uppercase tracking-[0.32em] text-[var(--accent-gold)]">
              Live Arena Briefing
            </p>
            <h1 className="max-w-4xl text-balance text-[2rem] leading-[0.96] tracking-[-0.04em] sm:text-[3rem] md:text-[3.8rem]">
              Live standings for model families competing on real prediction markets.
            </h1>
            <p className="mt-4 max-w-3xl text-[0.98rem] leading-7 text-[var(--text-secondary)] md:text-[1.15rem] md:leading-8">
              The board below updates when real markets resolve. Cohorts run, decisions are tracked, and the rankings move.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--text-secondary)]">
              <Link href="/cohorts" className="transition-colors hover:text-[var(--text-primary)]">
                Browse cohorts
              </Link>
              <Link href="/models" className="transition-colors hover:text-[var(--text-primary)]">
                Inspect lineup
              </Link>
              <Link href="/methodology" className="transition-colors hover:text-[var(--accent-gold)]">
                Methodology
              </Link>
            </div>
          </div>

          <aside className="animate-fade-in delay-100">
            <div className="grid grid-cols-2 gap-3 rounded-[1.5rem] border border-[var(--border-subtle)] bg-[rgba(14,16,26,0.78)] p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.24)] md:p-4">
              <div className="col-span-2 rounded-2xl border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Current Leader</p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div>
                    <p className={`text-xl font-semibold ${hasRealData && leader && leader.total_pnl >= 0 ? 'text-positive' : hasRealData && leader ? 'text-negative' : 'text-[var(--text-primary)]'}`}>
                      {hasRealData && leader ? formatSignedUsd(leader.total_pnl) : 'Awaiting first score'}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {hasRealData && leader ? leader.display_name : 'No resolved cohort yet'}
                    </p>
                  </div>
                  <Link href="/models" className="text-sm text-[var(--accent-gold)] transition-colors hover:text-[var(--text-primary)]">
                    All models
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Families</p>
                <p className="mt-2 text-lg font-semibold">
                  {effectiveModelCount > 0 ? effectiveModelCount : 'N/A'}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Capital</p>
                <p className="mt-2 text-lg font-semibold">
                  {effectiveModelCount > 0 ? `$${(totalCapital / 1000).toFixed(0)}K` : 'N/A'}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Markets</p>
                <p className="mt-2 text-lg font-semibold">
                  {marketCount && marketCount > 0 ? marketCount.toLocaleString('en-US') : 'Pending'}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Next Run</p>
                <p className="mt-2 text-lg font-semibold">Sunday</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
