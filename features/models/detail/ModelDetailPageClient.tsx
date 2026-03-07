'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { MODELS } from '@/lib/constants';
import { ModelCohortPerformancePanel } from '@/features/models/detail/components/ModelCohortPerformancePanel';
import { ModelDetailHeader } from '@/features/models/detail/components/ModelDetailHeader';
import { ModelDetailNotFound } from '@/features/models/detail/components/ModelDetailNotFound';
import { ModelPerformanceSection } from '@/features/models/detail/components/ModelPerformanceSection';
import { ModelRecentDecisionsPanel } from '@/features/models/detail/components/ModelRecentDecisionsPanel';
import { ModelStatsGrid } from '@/features/models/detail/components/ModelStatsGrid';
import { DecisionReasoningModal } from '@/features/models/detail/components/DecisionReasoningModal';
import type { ModelDecision, ModelDetailData } from '@/features/models/detail/types';
import { createModelChartData } from '@/features/models/detail/utils';
import type { TimeRange } from '@/components/charts/TimeRangeSelector';

export default function ModelDetailPageClient() {
  const params = useParams<{ id: string }>();
  const modelId = params.id;
  const model = MODELS.find((entry) => entry.id === modelId);
  const [data, setData] = useState<ModelDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<ModelDecision | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      try {
        const response = await fetch(`/api/models/${modelId}`);
        if (!response.ok || isCancelled) {
          return;
        }

        const json = await response.json() as ModelDetailData;
        if (!isCancelled) {
          setData(json);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching model data:', error);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [modelId]);

  if (!model) {
    return <ModelDetailNotFound message="Model Not Found" />;
  }

  const chartData = useMemo(() => createModelChartData(modelId, data), [data, modelId]);
  const chartModels = [{
    id: model.id,
    name: model.displayName,
    color: model.color
  }];

  return (
    <div className="container-wide mx-auto px-6 py-12">
      <ModelDetailHeader model={model} />
      <ModelStatsGrid
        avgBrier={data?.avg_brier_score ?? null}
        avgPnlPercent={data?.avg_pnl_percent ?? 0}
        loading={loading}
        numCohorts={data?.num_cohorts ?? 0}
        totalPnl={data?.total_pnl ?? 0}
        winRate={data?.win_rate ?? null}
      />
      <ModelPerformanceSection
        chartData={chartData}
        chartModels={chartModels}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ModelCohortPerformancePanel
          cohorts={data?.cohort_performance ?? []}
          loading={loading}
          modelId={modelId}
        />
        <ModelRecentDecisionsPanel
          decisions={data?.recent_decisions ?? []}
          loading={loading}
          onSelectDecision={setSelectedDecision}
        />
      </div>

      <DecisionReasoningModal
        decision={selectedDecision}
        onClose={() => setSelectedDecision(null)}
      />
    </div>
  );
}
