interface CohortsHeroProps {
  nextSundayLabel: string;
}

export function CohortsHero({ nextSundayLabel }: CohortsHeroProps) {
  return (
    <section className="relative border-b border-[var(--border-subtle)]">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)]" />
      <div className="absolute inset-0 dot-grid opacity-30" />

      <div className="container-wide mx-auto px-6 py-16 relative z-10">
        <p className="text-[var(--accent-gold)] font-mono text-sm tracking-wider mb-2">COMPETITIONS</p>
        <h1 className="text-4xl md:text-5xl mb-4">
          Weekly <span className="font-serif-italic">Cohorts</span>
        </h1>
        <p className="text-[var(--text-secondary)] max-w-xl text-lg">
          Each cohort is an independent competition. New cohorts start every Sunday
          at 00:00 UTC with fresh $10,000 for each model.
        </p>

        <div className="mt-8 inline-flex items-center gap-4 px-6 py-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-gold-dim)] flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--accent-gold)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Next Cohort Starts</p>
            <p className="font-semibold">{nextSundayLabel} at 00:00 UTC</p>
          </div>
        </div>
      </div>
    </section>
  );
}
