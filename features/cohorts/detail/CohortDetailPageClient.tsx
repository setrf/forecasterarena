'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDisplayDate } from '@/lib/utils';
import type { TimeRange } from '@/components/charts/TimeRangeSelector';
import { useCohortDetailData } from '@/features/cohorts/detail/useCohortDetailData';
import { CohortDetailHeader } from '@/features/cohorts/detail/components/CohortDetailHeader';
import { CohortDetailNotFound } from '@/features/cohorts/detail/components/CohortDetailNotFound';
import { CohortLeaderboardTable } from '@/features/cohorts/detail/components/CohortLeaderboardTable';
import { CohortPerformanceSection } from '@/features/cohorts/detail/components/CohortPerformanceSection';
import { CohortRecentDecisionsPanel } from '@/features/cohorts/detail/components/CohortRecentDecisionsPanel';
import { CohortStatsGrid } from '@/features/cohorts/detail/components/CohortStatsGrid';
import { createCohortChartData, getCohortChartModels, sortAgentsByValue } from '@/features/cohorts/detail/utils';

export default function CohortDetailPageClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const cohortId = params.id;
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const { cohort, agents, stats, equityCurves, releaseChanges, decisions, loading, error } = useCohortDetailData(cohortId);

  const chartData = useMemo(() => createCohortChartData(equityCurves), [equityCurves]);
  const sortedAgents = useMemo(() => sortAgentsByValue(agents), [agents]);
  const chartModels = useMemo(() => getCohortChartModels(sortedAgents), [sortedAgents]);

  if (loading) {
    return (
      <div className="container-wide mx-auto px-6 py-20 text-center text-[var(--text-muted)]">
        Loading cohort...
      </div>
    );
  }

  if (error || !cohort) {
    return <CohortDetailNotFound title={error || 'Cohort Not Found'} />;
  }

  return (
    <div className="container-wide mx-auto px-6 py-12">
      <CohortDetailHeader cohort={cohort} />
      <CohortStatsGrid stats={stats} />
      <CohortPerformanceSection
        chartData={chartData}
        chartModels={chartModels}
        releaseChanges={releaseChanges}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
      <CohortLeaderboardTable
        cohortId={cohortId}
        agents={sortedAgents}
        onNavigate={router.push}
      />
      <CohortRecentDecisionsPanel decisions={decisions} />

      <div className="mt-8 text-center text-sm text-[var(--text-muted)]">
        Started {formatDisplayDate(cohort.started_at)}
        {cohort.completed_at && ` • Completed ${formatDisplayDate(cohort.completed_at)}`}
      </div>
    </div>
  );
}
