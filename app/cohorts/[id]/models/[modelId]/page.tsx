import { redirect } from 'next/navigation';
import AgentCohortDetailPageClient from '@/features/cohorts/model-detail/AgentCohortDetailPageClient';
import { resolveModelFamily } from '@/lib/db/queries';

export default async function AgentCohortDetailPage(
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  const { id, modelId } = await params;
  const family = resolveModelFamily(modelId);

  if (family && family.slug && modelId !== family.slug) {
    redirect(`/cohorts/${id}/models/${family.slug}`);
  }

  return <AgentCohortDetailPageClient />;
}
