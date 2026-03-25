'use client';

import { useEffect, useRef, useState } from 'react';
import { ModelsGrid } from '@/features/models/list/components/ModelsGrid';
import { ModelsHeroSection } from '@/features/models/list/components/ModelsHeroSection';
import { ModelsMethodologySection } from '@/features/models/list/components/ModelsMethodologySection';
import { fetchModelsPageData } from '@/features/models/list/api';
import type { CatalogModel, ModelStats } from '@/features/models/list/types';
import { createStatsMap, sortModelsByPnl } from '@/features/models/list/utils';

export default function ModelsPageClient() {
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [stats, setStats] = useState<Map<string, ModelStats>>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [hasRealData, setHasRealData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const abortController = new AbortController();

    async function fetchStats() {
      try {
        const result = await fetchModelsPageData(abortController.signal);
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        if (result.status === 'error') {
          setModels([]);
          setStats(new Map());
          setHasRealData(false);
          setError(result.error);
          return;
        }

        setModels(result.data.models);
        setStats(createStatsMap(result.data.leaderboard));
        setHasRealData(result.data.hasRealData);
        setError(null);
      } catch {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setModels([]);
        setStats(new Map());
        setHasRealData(false);
        setError('Failed to load model rankings.');
      } finally {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setLoading(false);
      }
    }

    void fetchStats();

    return () => {
      abortController.abort();
    };
  }, []);

  const sortedModels = sortModelsByPnl(models, stats);
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
        modelCount={models.length}
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
