'use client';

import { useEffect, useState } from 'react';
import { hasLiveCompetitionData } from '@/lib/competition-state';
import type { TimeRange } from '@/components/charts/TimeRangeSelector';
import { emptyLeaderboard, type LeaderboardEntry } from '@/features/home/types';
import { CTASection } from '@/features/home/components/CTASection';
import { HeroSection } from '@/features/home/components/HeroSection';
import { HowItWorks } from '@/features/home/components/HowItWorks';
import { LeaderboardPreview } from '@/features/home/components/LeaderboardPreview';
import { LiveStatsDashboard } from '@/features/home/components/LiveStatsDashboard';
import { PerformanceSection } from '@/features/home/components/PerformanceSection';

export default function HomePageClient() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(emptyLeaderboard);
  const [hasRealData, setHasRealData] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [marketCount, setMarketCount] = useState<number | null>(null);
  const [chartData, setChartData] = useState<Array<{ date: string; [key: string]: number | string }>>([]);
  const [chartError, setChartError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');

  useEffect(() => {
    async function fetchHomeData() {
      try {
        const [leaderboardRes, marketsRes] = await Promise.all([
          fetch('/api/leaderboard', { cache: 'no-store' }),
          fetch('/api/markets?limit=1', { cache: 'no-store' }),
        ]);

        if (!leaderboardRes.ok) {
          setLeaderboardError('Leaderboard data is temporarily unavailable.');
          return;
        }

        const [data, marketsData] = await Promise.all([
          leaderboardRes.json(),
          marketsRes.ok ? marketsRes.json() : Promise.resolve(null),
        ]);

        setMarketCount(marketsData?.stats?.total_markets ?? null);

        if (data.leaderboard && data.leaderboard.length > 0) {
          setLeaderboard(data.leaderboard);
        }

        setHasRealData(hasLiveCompetitionData({
          leaderboard: data.leaderboard,
          cohorts: data.cohorts
        }));
        setLeaderboardError(null);
      } catch {
        setLeaderboardError('Leaderboard data is temporarily unavailable.');
      }
    }

    fetchHomeData();
  }, []);

  useEffect(() => {
    async function fetchChartData() {
      try {
        const res = await fetch(`/api/performance-data?range=${timeRange}`, {
          cache: 'no-store'
        });

        if (!res.ok) {
          setChartError('Performance data is temporarily unavailable.');
          return;
        }

        const json = await res.json();
        setChartData(json.data || []);
        setChartError(null);
      } catch {
        setChartError('Performance data is temporarily unavailable.');
      }
    }

    fetchChartData();
  }, [timeRange]);

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
