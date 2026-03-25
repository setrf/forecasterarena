import { notFound } from 'next/navigation';
import type { CohortDetailLoadResult } from '@/features/cohorts/detail/api';
import type { AgentStats, Cohort, Decision } from '@/features/cohorts/detail/types';
import CohortDetailPageClient from '@/features/cohorts/detail/CohortDetailPageClient';
import { getCohortDetail } from '@/lib/application/cohorts/getCohortDetail';

type CohortDetailPageData = Extract<CohortDetailLoadResult, { status: 'ok' }>['data'];

export default async function CohortDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = getCohortDetail(id);
  if (result.status !== 'ok') notFound();
  return <CohortDetailPageClient cohortId={id} initialData={{
    cohort: result.data.cohort as Cohort,
    agents: result.data.agents.map((agent) => ({ ...agent, model_color: agent.model_color ?? '#94A3B8' })) as AgentStats[],
    stats: result.data.stats,
    equityCurves: result.data.equity_curves,
    releaseChanges: result.data.release_changes,
    decisions: result.data.recent_decisions as unknown as Decision[]
  } as CohortDetailPageData} />;
}
