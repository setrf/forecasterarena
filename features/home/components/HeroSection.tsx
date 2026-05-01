import Link from 'next/link';
import { PageIntro } from '@/components/ui/PageIntro';
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
    <PageIntro
      className="page-intro--integrated page-intro--home-briefing"
      containerClassName="pt-5 pb-8 md:pt-6 md:pb-10"
      contentClassName="max-w-[44rem]"
      eyebrow="Live Arena Briefing"
      title="Current v2 standings for model families competing on real prediction markets."
      description="The board below tracks active v2 cohorts. Archived v1 cohorts remain inspectable, but they no longer move current rankings."
      actions={(
        <>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[rgba(17,18,28,0.82)] px-4 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
            <span className={`h-2 w-2 rounded-full ${hasRealData ? 'bg-[var(--color-positive)] animate-pulse' : 'bg-[var(--accent-gold)]'}`} />
            <span className="text-sm text-[var(--text-secondary)]">{statusLabel}</span>
          </div>
          <Link href="/cohorts" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
            Browse cohorts
          </Link>
          <Link href="/models" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
            Inspect lineup
          </Link>
          <Link href="/methodology" className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-gold)]">
            Methodology
          </Link>
        </>
      )}
      aside={(
        <div className="surface-panel metric-grid metric-grid--compact p-3.5 md:p-4">
          <div className="metric-tile col-span-2">
            <p className="metric-tile__label">Current v2 Leader</p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <div>
                <p className={`metric-tile__value ${hasRealData && leader && leader.total_pnl >= 0 ? 'text-positive' : hasRealData && leader ? 'text-negative' : ''}`}>
                  {hasRealData && leader ? formatSignedUsd(leader.total_pnl) : 'Awaiting first score'}
                </p>
                <p className="metric-tile__meta">
                  {hasRealData && leader ? leader.display_name : 'No resolved cohort yet'}
                </p>
              </div>
              <Link href="/models" className="text-sm text-[var(--accent-gold)] transition-colors hover:text-[var(--text-primary)]">
                All models
              </Link>
            </div>
          </div>
          <div className="metric-tile">
            <p className="metric-tile__label">Families</p>
            <p className="metric-tile__value">{effectiveModelCount > 0 ? effectiveModelCount : 'N/A'}</p>
          </div>
          <div className="metric-tile">
            <p className="metric-tile__label">Capital</p>
            <p className="metric-tile__value">{effectiveModelCount > 0 ? `$${(totalCapital / 1000).toFixed(0)}K` : 'N/A'}</p>
          </div>
          <div className="metric-tile">
            <p className="metric-tile__label">Markets</p>
            <p className="metric-tile__value">{marketCount && marketCount > 0 ? marketCount.toLocaleString('en-US') : 'Pending'}</p>
          </div>
          <div className="metric-tile">
            <p className="metric-tile__label">Next Run</p>
            <p className="metric-tile__value">Sunday</p>
          </div>
        </div>
      )}
    />
  );
}
