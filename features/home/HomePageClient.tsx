'use client';

import { CTASection } from '@/features/home/components/CTASection';
import { HeroSection } from '@/features/home/components/HeroSection';
import { HowItWorks } from '@/features/home/components/HowItWorks';
import { LeaderboardPreview } from '@/features/home/components/LeaderboardPreview';
import { LiveStatsDashboard } from '@/features/home/components/LiveStatsDashboard';
import { PerformanceSection } from '@/features/home/components/PerformanceSection';
import { useHomePageData } from '@/features/home/useHomePageData';

export default function HomePageClient() {
  const {
    leaderboard,
    hasRealData,
    leaderboardError,
    marketCount,
    chartData,
    chartError,
    timeRange,
    setTimeRange
  } = useHomePageData();

  return (
    <>
      <HeroSection hasRealData={hasRealData} hasSyncedMarkets={(marketCount ?? 0) > 0} />
      {leaderboardError && (
        <section className="container-wide mx-auto px-6 pt-6">
          <div className="rounded-xl border border-[rgba(251,113,133,0.3)] bg-[rgba(251,113,133,0.08)] px-4 py-3" role="status" aria-live="polite">
            <p className="text-sm text-[var(--accent-rose)]">{leaderboardError}</p>
          </div>
        </section>
      )}
      <LiveStatsDashboard
        leader={leaderboard[0] || null}
        hasRealData={hasRealData}
        marketCount={marketCount}
      />
      <PerformanceSection
        chartData={chartData}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        error={chartError}
      />
      <LeaderboardPreview data={leaderboard} hasRealData={hasRealData} />
      <HowItWorks />
      <CTASection />
    </>
  );
}
