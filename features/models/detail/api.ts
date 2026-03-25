import type { ModelDetailData } from '@/features/models/detail/types';

export type ModelDetailLoadResult =
  | {
      status: 'ok';
      data: ModelDetailData;
    }
  | {
      status: 'error';
      error: string;
    };

export async function fetchModelDetailData(
  familySlugOrLegacyId: string,
  signal?: AbortSignal
): Promise<ModelDetailLoadResult> {
  const response = await fetch(`/api/models/${familySlugOrLegacyId}`, { signal });
  if (!response.ok) {
    return {
      status: 'error',
      error: response.status === 404 ? 'Model not found' : 'Failed to load model'
    };
  }

  return {
    status: 'ok',
    data: await response.json() as ModelDetailData
  };
}
