'use client';

import { useEffect, useState } from 'react';
import { fetchModelDetailData } from '@/features/models/detail/api';
import type { ModelDetailData } from '@/features/models/detail/types';

export function useModelDetailData(familySlugOrLegacyId: string) {
  const [data, setData] = useState<ModelDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadModelDetail() {
      try {
        const payload = await fetchModelDetailData(familySlugOrLegacyId);
        if (!isCancelled && payload) {
          setData(payload);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching model data:', error);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadModelDetail();

    return () => {
      isCancelled = true;
    };
  }, [familySlugOrLegacyId]);

  return {
    data,
    loading
  };
}
