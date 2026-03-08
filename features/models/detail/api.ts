import type { ModelDetailData } from '@/features/models/detail/types';

export async function fetchModelDetailData(
  familySlugOrLegacyId: string
): Promise<ModelDetailData | null> {
  const response = await fetch(`/api/models/${familySlugOrLegacyId}`);
  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<ModelDetailData>;
}
