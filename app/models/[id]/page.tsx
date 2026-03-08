import { redirect } from 'next/navigation';
import ModelDetailPageClient from '@/features/models/detail/ModelDetailPageClient';
import { resolveModelFamily } from '@/lib/db/queries';

export default async function ModelDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const family = resolveModelFamily(id);

  if (family && family.slug && id !== family.slug) {
    redirect(`/models/${family.slug}`);
  }

  return <ModelDetailPageClient />;
}
