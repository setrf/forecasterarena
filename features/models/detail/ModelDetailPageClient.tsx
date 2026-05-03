'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import type { TimeRange } from '@/components/charts/TimeRangeSelector';
import { PageContainer } from '@/components/ui/PageContainer';
import { useModelDetailData } from '@/features/models/detail/useModelDetailData';
import { ModelCohortPerformancePanel } from '@/features/models/detail/components/ModelCohortPerformancePanel';
import { ModelDetailHeader } from '@/features/models/detail/components/ModelDetailHeader';
import { ModelDetailNotFound } from '@/features/models/detail/components/ModelDetailNotFound';
import { ModelPerformanceSection } from '@/features/models/detail/components/ModelPerformanceSection';
import { ModelRecentDecisionsPanel } from '@/features/models/detail/components/ModelRecentDecisionsPanel';
import { ModelStatsGrid } from '@/features/models/detail/components/ModelStatsGrid';
import { DecisionReasoningModal } from '@/features/models/detail/components/DecisionReasoningModal';
import { useScopedPerformanceChartData } from '@/features/performance-chart/useScopedPerformanceChartData';
import type { ModelDecision } from '@/features/models/detail/types';
import type { ModelDetailData } from '@/features/models/detail/types';
import { createModelChartData } from '@/features/models/detail/utils';

interface ModelDetailPageClientProps {
  initialData?: ModelDetailData | null;
  familySlugOrLegacyId?: string;
}

export default function ModelDetailPageClient({
  initialData = null,
  familySlugOrLegacyId: initialFamilySlugOrLegacyId
}: ModelDetailPageClientProps = {}) {
  const params = useParams<{ id: string }>();
  const familySlugOrLegacyId = initialFamilySlugOrLegacyId ?? params.id;
  const [selectedDecision, setSelectedDecision] = useState<ModelDecision | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const { data, loading, error } = useModelDetailData(familySlugOrLegacyId, initialData);
  const model = data ? {
    id: data.model.id,
    family_id: data.model.family_id,
    slug: data.model.slug,
    legacy_model_id: data.model.legacy_model_id,
    displayName: data.model.display_name,
    shortDisplayName: data.model.short_display_name,
    provider: data.model.provider,
    color: data.model.color,
    openrouterId: data.model.openrouter_id ?? undefined,
    currentReleaseId: data.model.current_release_id ?? undefined,
    currentReleaseName: data.model.current_release_name ?? undefined
  } : null;

  const canonicalModelSlug = model?.slug ?? model?.id ?? familySlugOrLegacyId;
  const chartModelId = canonicalModelSlug;
  const initialChartData = useMemo(() => createModelChartData(chartModelId, data), [chartModelId, data]);
  const chartSeries = useScopedPerformanceChartData({
    timeRange,
    familyId: model?.family_id ?? null,
    enabled: Boolean(model?.family_id),
    initialData: initialChartData,
    initialReleaseChanges: data?.release_changes ?? []
  });
  const chartModels = model ? [{
    id: chartModelId,
    name: model.displayName,
    color: model.color,
    currentReleaseName: model.currentReleaseName ?? null
  }] : [];
  const totalResolvedBets = data?.cohort_performance.reduce(
    (sum, cohort) => sum + cohort.num_resolved_bets,
    0
  ) ?? 0;

  if (!loading && !model) {
    return <ModelDetailNotFound message={error || 'Model Not Found'} />;
  }

  return (
    <PageContainer>
      {model && <ModelDetailHeader model={model} />}
      <ModelStatsGrid
        avgPnlPercent={data?.avg_pnl_percent ?? 0}
        loading={loading}
        numCohorts={data?.num_cohorts ?? 0}
        totalResolvedBets={totalResolvedBets}
        totalPnl={data?.total_pnl ?? 0}
        winRate={data?.win_rate ?? null}
      />
      <ModelPerformanceSection
        chartData={chartSeries.data}
        chartModels={chartModels}
        releaseChanges={chartSeries.releaseChanges}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ModelCohortPerformancePanel
          cohorts={data?.cohort_performance ?? []}
          loading={loading}
          familySlug={canonicalModelSlug}
          title="Current v2 Cohorts"
          emptyTitle="No current v2 cohort data yet"
        />
        <ModelRecentDecisionsPanel
          decisions={data?.recent_decisions ?? []}
          loading={loading}
          onSelectDecision={setSelectedDecision}
        />
      </div>

      {(loading || (data?.archived_cohort_performance.length ?? 0) > 0) && (
        <div className="mt-8">
          <ModelCohortPerformancePanel
            cohorts={data?.archived_cohort_performance ?? []}
            loading={loading}
            familySlug={canonicalModelSlug}
            title="Archived v1 History"
            emptyTitle="No archived v1 history"
            description="Historical v1 cohorts remain accessible but are excluded from current v2 averages, graphs, and rankings."
          />
        </div>
      )}

      <DecisionReasoningModal
        decision={selectedDecision}
        onClose={() => setSelectedDecision(null)}
      />
    </PageContainer>
  );
}
