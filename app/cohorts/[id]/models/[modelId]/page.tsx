import { redirect } from 'next/navigation';
import AgentCohortDetailPageClient from '@/features/cohorts/model-detail/AgentCohortDetailPageClient';
import { resolveModelFamily } from '@/lib/db/queries';

export default async function AgentCohortDetailPage(
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  const { id, modelId: familySlugOrLegacyId } = await params;
  const family = resolveModelFamily(familySlugOrLegacyId);

  if (family && family.slug && familySlugOrLegacyId !== family.slug) {
    redirect(`/cohorts/${id}/models/${family.slug}`);
  }

  return <AgentCohortDetailPageClient />;
}
