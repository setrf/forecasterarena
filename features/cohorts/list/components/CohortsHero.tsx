import { PageIntro } from '@/components/ui/PageIntro';

interface CohortsHeroProps {
  nextSundayLabel: string;
}

export function CohortsHero({ nextSundayLabel }: CohortsHeroProps) {
  return (
    <PageIntro
      eyebrow="Competitions"
      title={<>Weekly Cohorts</>}
      description="Each cohort is an independent competition with fresh balance, shared constraints, and release-aware lineage tracking."
      aside={(
        <div className="surface-panel p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-gold-dim)]">
              <svg className="w-5 h-5 text-[var(--accent-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="metric-tile__label">Next Cohort Starts</p>
              <p className="metric-tile__value text-xl">{nextSundayLabel}</p>
              <p className="metric-tile__meta">Sunday at 00:00 UTC</p>
            </div>
          </div>
        </div>
      )}
    />
  );
}
