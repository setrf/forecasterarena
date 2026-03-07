import type { ModelDetailData } from '@/features/models/detail/types';

export async function fetchModelDetailData(
  modelId: string
): Promise<ModelDetailData | null> {
  const response = await fetch(`/api/models/${modelId}`);
  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<ModelDetailData>;
}
