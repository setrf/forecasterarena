'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { TimeRange } from '@/components/charts/TimeRangeSelector';
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
import type { AgentCohortData, Decision } from '@/features/cohorts/model-detail/types';
import { createAgentCohortChartData } from '@/features/cohorts/model-detail/utils';

export default function AgentCohortDetailPageClient() {
  const params = useParams<{ id: string; modelId: string }>();
  const router = useRouter();
  const cohortId = params.id;
  const modelId = params.modelId;

  const [data, setData] = useState<AgentCohortData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/cohorts/${cohortId}/models/${modelId}`);
        if (!response.ok) {
          if (response.status === 404) {
            const payload = await response.json();
            setError(payload.error || 'Not found');
          } else {
            setError('Failed to load data');
          }
          return;
        }

        const json = await response.json();
        setData(json);
      } catch (fetchError) {
        setError('Failed to load data');
        console.error(fetchError);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [cohortId, modelId]);

  const chartData = useMemo(() => createAgentCohortChartData(data, modelId), [data, modelId]);
  const chartModels = data?.model ? [{
    id: data.model.id,
    name: data.model.display_name,
    color: data.model.color
  }] : [];

  if (loading) {
    return (
      <div className="container-wide mx-auto px-6 py-20 text-center text-[var(--text-muted)]">
        Loading...
      </div>
    );
  }

  if (error || !data) {
    return <AgentCohortDetailNotFound error={error || 'Not Found'} />;
  }

  return (
    <div className="container-wide mx-auto px-6 py-12">
      <AgentCohortBreadcrumbs
        cohortId={cohortId}
        cohortNumber={data.cohort.cohort_number}
        modelName={data.model.display_name}
      />
      <AgentCohortHeader data={data} />
      <AgentStatsGrids data={data} />
      <AgentPerformanceSection
        chartData={chartData}
        chartModels={chartModels}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
      <AgentOverviewPanels cohortId={cohortId} data={data} />
      <DecisionHistoryPanel
        decisions={data.decisions}
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
    </div>
  );
}
