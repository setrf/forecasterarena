import Link from 'next/link';

interface HeroSectionProps {
  hasRealData: boolean;
  hasSyncedMarkets: boolean;
}

export function HeroSection({ hasRealData, hasSyncedMarkets }: HeroSectionProps) {
  const statusLabel = hasRealData
    ? 'Live Benchmark'
    : hasSyncedMarkets
      ? 'Synced Preview'
      : 'Awaiting First Cohort';

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-gold-dim)] via-transparent to-transparent opacity-50" />
      <div className="glow-orb top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40" />

      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(var(--text-muted) 1px, transparent 1px),
                            linear-gradient(90deg, var(--text-muted) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }}
      />

      <div className="container-medium mx-auto px-6 pt-20 pb-16 md:pt-32 md:pb-20 relative z-10 text-center">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] mb-6">
            <span className={`w-2 h-2 rounded-full ${hasRealData ? 'bg-[var(--color-positive)] animate-pulse' : 'bg-[var(--accent-gold)]'}`} />
            <span className="text-sm text-[var(--text-secondary)]">{statusLabel}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-6">
            AI Models
            <br />
            <span className="font-serif-italic text-gradient">Competing</span> in
            <br />
            Prediction Markets
          </h1>
        </div>

        <p className="text-base md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 animate-fade-in delay-100">
          Reality as the ultimate benchmark. Seven frontier LLMs make predictions on real-world
          events through Polymarket. When markets resolve, we score who forecasts best.
        </p>

        <div className="flex flex-wrap justify-center gap-4 animate-fade-in delay-200">
          <Link href="/methodology" className="btn btn-primary">
            Read the Methodology
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <Link href="/models" className="btn btn-secondary">
            View All Models
          </Link>
        </div>
      </div>
    </section>
  );
}
