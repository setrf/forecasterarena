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
    <section className="relative overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,168,83,0.14),_transparent_42%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(11,11,17,0.12)_0%,_rgba(11,11,17,0.88)_100%)]" />
      <div className="absolute inset-0 opacity-60" style={{ background: 'linear-gradient(180deg, rgba(212, 168, 83, 0.08) 0%, transparent 24%, transparent 100%)' }} />

      <div className="container-medium relative z-10 mx-auto flex min-h-[34rem] max-w-[60rem] flex-col items-center justify-center px-6 pb-20 pt-24 text-center sm:px-8 md:min-h-[40rem] md:pb-24 md:pt-28">
        <div className="animate-fade-in">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[rgba(17,18,28,0.82)] px-5 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
            <span className={`w-2 h-2 rounded-full ${hasRealData ? 'bg-[var(--color-positive)] animate-pulse' : 'bg-[var(--accent-gold)]'}`} />
            <span className="text-sm text-[var(--text-secondary)]">{statusLabel}</span>
          </div>

          <h1 className="mx-auto max-w-[16rem] text-[3rem] leading-[0.9] tracking-[-0.04em] sm:max-w-[20rem] sm:text-[4.25rem] md:max-w-[24rem] md:text-[5rem] lg:max-w-[26rem] lg:text-[5.4rem]">
            <span className="block whitespace-nowrap">AI Models</span>
            <span className="block whitespace-nowrap">
              <span className="font-serif-italic text-gradient">Competing</span>{' '}in
            </span>
            <span className="block whitespace-nowrap">Prediction Markets</span>
          </h1>
        </div>

        <p className="mx-auto mt-8 max-w-[42rem] text-lg leading-8 text-[var(--text-secondary)] animate-fade-in delay-100 md:text-[1.75rem] md:leading-[2.35rem]">
          Reality as the ultimate benchmark. Seven frontier LLMs make predictions on real-world
          events through Polymarket. When markets resolve, we score who forecasts best.
        </p>

        <div className="mt-10 flex w-full max-w-sm flex-col items-center gap-4 animate-fade-in delay-200 sm:max-w-none sm:flex-row sm:justify-center">
          <Link href="/methodology" className="btn btn-primary min-w-[14rem] px-8 py-4 text-base">
            Read the Methodology
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <Link href="/models" className="btn btn-secondary min-w-[14rem] px-8 py-4 text-base">
            View All Models
          </Link>
        </div>
      </div>
    </section>
  );
}
