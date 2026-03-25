import { notFound, redirect } from 'next/navigation';
import ModelDetailPageClient from '@/features/models/detail/ModelDetailPageClient';
import type { ModelDetailData } from '@/features/models/detail/types';
import { getModelDetail } from '@/lib/application/models/getModelDetail';
import { resolveModelFamily } from '@/lib/db/queries';

export default async function ModelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: familySlugOrLegacyId } = await params;
  const family = resolveModelFamily(familySlugOrLegacyId);
  if (family?.slug && familySlugOrLegacyId !== family.slug) redirect(`/models/${family.slug}`);
  const result = getModelDetail(familySlugOrLegacyId);
  if (result.status !== 'ok') notFound();
  return <ModelDetailPageClient familySlugOrLegacyId={familySlugOrLegacyId} initialData={{
    ...result.data,
    model: { ...result.data.model, color: result.data.model.color ?? '#94A3B8' }
  } as unknown as ModelDetailData} />;
}
