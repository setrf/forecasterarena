'use client';

import { useEffect, useState } from 'react';
import { hasLiveCompetitionData } from '@/lib/competition-state';
import { ModelsGrid } from '@/features/models/list/components/ModelsGrid';
import { ModelsHeroSection } from '@/features/models/list/components/ModelsHeroSection';
import { ModelsMethodologySection } from '@/features/models/list/components/ModelsMethodologySection';
import type { LeaderboardResponse, ModelStats } from '@/features/models/list/types';
import { createStatsMap, sortModelsByPnl } from '@/features/models/list/utils';

export default function ModelsPageClient() {
  const [stats, setStats] = useState<Map<string, ModelStats>>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchStats() {
      try {
        const res = await fetch('/api/leaderboard', { cache: 'no-store' });
        if (!res.ok) {
          if (!isCancelled) {
            setError('Failed to load model rankings.');
          }
          return;
        }

        const data = await res.json() as LeaderboardResponse;
        if (isCancelled) {
          return;
        }

        setStats(createStatsMap(data.leaderboard));
        setHasRealData(hasLiveCompetitionData({
          leaderboard: data.leaderboard,
          cohorts: data.cohorts
        }));
        setError(null);
      } catch {
        if (!isCancelled) {
          setError('Failed to load model rankings.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      isCancelled = true;
    };
  }, []);

  const sortedModels = sortModelsByPnl(stats);
  const leader = hasRealData ? (sortedModels[0] ?? null) : null;
  const leaderStats = leader ? stats.get(leader.id) : undefined;
  const otherModels = hasRealData ? sortedModels.slice(1) : sortedModels;

  return (
    <div className="min-h-screen">
      <ModelsHeroSection
        error={error}
        hasRealData={hasRealData}
        leader={leader}
        leaderStats={leaderStats}
      />

      {error && (
        <section className="container-wide mx-auto px-6 pt-8">
          <div className="rounded-xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm text-[var(--accent-rose)]">
            {error}
          </div>
        </section>
      )}

      <ModelsGrid
        hasRealData={hasRealData}
        loading={loading}
        models={otherModels}
        stats={stats}
      />
      <ModelsMethodologySection />
    </div>
  );
}
