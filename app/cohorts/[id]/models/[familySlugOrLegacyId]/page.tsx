import { notFound, redirect } from 'next/navigation';
import AgentCohortDetailPageClient from '@/features/cohorts/model-detail/AgentCohortDetailPageClient';
import type { AgentCohortData } from '@/features/cohorts/model-detail/types';
import { getAgentCohortDetail } from '@/lib/application/cohorts/getAgentCohortDetail';
import { resolveModelFamily } from '@/lib/db/queries';

export default async function AgentCohortDetailPage({ params }: { params: Promise<{ id: string; familySlugOrLegacyId: string }> }) {
  const { id, familySlugOrLegacyId } = await params;
  const family = resolveModelFamily(familySlugOrLegacyId);
  if (family?.slug && familySlugOrLegacyId !== family.slug) redirect(`/cohorts/${id}/models/${family.slug}`);
  const result = getAgentCohortDetail(id, familySlugOrLegacyId);
  if (result.status !== 'ok') notFound();
  return <AgentCohortDetailPageClient cohortId={id} familySlugOrLegacyId={familySlugOrLegacyId} initialData={{
    ...result.data,
    model: { ...result.data.model, color: result.data.model.color ?? '#94A3B8' }
  } as unknown as AgentCohortData} />;
}
