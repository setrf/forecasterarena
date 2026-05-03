'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { TimeRange } from '@/components/charts/TimeRangeSelector';
import { PageContainer, PageLoadingState } from '@/components/ui/PageContainer';
import { useAgentCohortDetailData } from '@/features/cohorts/model-detail/useAgentCohortDetailData';
import { AgentCohortBreadcrumbs } from '@/features/cohorts/model-detail/components/AgentCohortBreadcrumbs';
import { AgentCohortDetailNotFound } from '@/features/cohorts/model-detail/components/AgentCohortDetailNotFound';
import { AgentCohortHeader } from '@/features/cohorts/model-detail/components/AgentCohortHeader';
import { AgentOverviewPanels } from '@/features/cohorts/model-detail/components/AgentOverviewPanels';
import { AgentPerformanceSection } from '@/features/cohorts/model-detail/components/AgentPerformanceSection';
import { AgentPositionsSection } from '@/features/cohorts/model-detail/components/AgentPositionsSection';
import { AgentStatsGrids } from '@/features/cohorts/model-detail/components/AgentStatsGrids';
import { DecisionHistoryPanel } from '@/features/cohorts/model-detail/components/DecisionHistoryPanel';
import { DecisionReasoningModal } from '@/features/cohorts/model-detail/components/DecisionReasoningModal';
import { TradeHistoryPanel } from '@/features/cohorts/model-detail/components/TradeHistoryPanel';
import { useScopedPerformanceChartData } from '@/features/performance-chart/useScopedPerformanceChartData';
import type { AgentCohortData, Decision } from '@/features/cohorts/model-detail/types';
import { createAgentCohortChartData } from '@/features/cohorts/model-detail/utils';

interface AgentCohortDetailPageClientProps {
  initialData?: AgentCohortData | null;
  cohortId?: string;
  familySlugOrLegacyId?: string;
}

export default function AgentCohortDetailPageClient({
  initialData = null,
  cohortId: initialCohortId,
  familySlugOrLegacyId: initialFamilySlugOrLegacyId
}: AgentCohortDetailPageClientProps = {}) {
  const params = useParams<{ id: string; familySlugOrLegacyId: string }>();
  const router = useRouter();
  const cohortId = initialCohortId ?? params.id;
  const familySlugOrLegacyId = initialFamilySlugOrLegacyId ?? params.familySlugOrLegacyId;

  const { data, loading, error } = useAgentCohortDetailData(cohortId, familySlugOrLegacyId, initialData);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');

  const chartKey = data?.model?.slug ?? data?.model?.id ?? familySlugOrLegacyId;
  const initialChartData = useMemo(() => createAgentCohortChartData(data, chartKey), [data, chartKey]);
  const chartSeries = useScopedPerformanceChartData({
    timeRange,
    cohortId,
    familyId: data?.model?.family_id ?? null,
    enabled: Boolean(data?.model?.family_id),
    initialData: initialChartData,
    initialReleaseChanges: data?.release_changes ?? []
  });
  const chartModels = data?.model ? [{
    id: chartKey,
    name: data.model.display_name,
    color: data.model.color,
    currentReleaseName: data.model.release_name ?? null
  }] : [];

  if (loading) {
    return (
      <PageLoadingState>
        Loading...
      </PageLoadingState>
    );
  }

  if (error || !data) {
    return <AgentCohortDetailNotFound error={error || 'Not Found'} />;
  }

  return (
    <PageContainer>
      <AgentCohortBreadcrumbs
        cohortId={cohortId}
        cohortNumber={data.cohort.cohort_number}
        modelName={data.model.display_name}
        releaseName={data.model.release_name}
      />
      <AgentCohortHeader data={data} />
      <AgentStatsGrids data={data} />
      <AgentPerformanceSection
        chartData={chartSeries.data}
        chartModels={chartModels}
        releaseChanges={chartSeries.releaseChanges}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
      <AgentOverviewPanels cohortId={cohortId} data={data} />
      <DecisionHistoryPanel
        decisions={data.decisions}
        decisionEligible={data.cohort.decision_eligible}
        onSelectDecision={setSelectedDecision}
      />
      <AgentPositionsSection
        positions={data.positions}
        closedPositions={data.closed_positions}
        positionCount={data.stats.position_count}
        onNavigate={router.push}
      />
      <TradeHistoryPanel
        trades={data.trades}
        tradeCount={data.stats.trade_count}
        onNavigate={router.push}
      />
      <DecisionReasoningModal
        decision={selectedDecision}
        onClose={() => setSelectedDecision(null)}
      />
    </PageContainer>
  );
}
