'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDisplayDate } from '@/lib/utils';
import type { TimeRange } from '@/components/charts/TimeRangeSelector';
import { CohortDetailHeader } from '@/features/cohorts/detail/components/CohortDetailHeader';
import { CohortDetailNotFound } from '@/features/cohorts/detail/components/CohortDetailNotFound';
import { CohortLeaderboardTable } from '@/features/cohorts/detail/components/CohortLeaderboardTable';
import { CohortPerformanceSection } from '@/features/cohorts/detail/components/CohortPerformanceSection';
import { CohortRecentDecisionsPanel } from '@/features/cohorts/detail/components/CohortRecentDecisionsPanel';
import { CohortStatsGrid } from '@/features/cohorts/detail/components/CohortStatsGrid';
import type { AgentStats, Cohort, CohortStats, Decision } from '@/features/cohorts/detail/types';
import { createCohortChartData, getCohortChartModels, sortAgentsByValue } from '@/features/cohorts/detail/utils';

export default function CohortDetailPageClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const cohortId = params.id;

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [equityCurves, setEquityCurves] = useState<Record<string, Array<{ date: string; value: number }>>>({});
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/cohorts/${cohortId}`);
        if (!response.ok) {
          setError(response.status === 404 ? 'Cohort not found' : 'Failed to load cohort');
          return;
        }

        const json = await response.json();
        setCohort(json.cohort);
        setAgents(json.agents);
        setStats(json.stats);
        setEquityCurves(json.equity_curves);
        setDecisions(json.recent_decisions);
      } catch {
        setError('Failed to load cohort');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [cohortId]);

  const chartData = useMemo(() => createCohortChartData(equityCurves), [equityCurves]);
  const chartModels = useMemo(() => getCohortChartModels(), []);
  const sortedAgents = useMemo(() => sortAgentsByValue(agents), [agents]);

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
