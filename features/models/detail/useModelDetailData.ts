'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchModelDetailData } from '@/features/models/detail/api';
import type { ModelDetailData } from '@/features/models/detail/types';

export function useModelDetailData(
  familySlugOrLegacyId: string,
  initialData: ModelDetailData | null = null
) {
  const [data, setData] = useState<ModelDetailData | null>(initialData);
  const [loading, setLoading] = useState(initialData === null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const abortController = new AbortController();

    setData(initialData);
    setError(null);
    setLoading(initialData === null);

    if (initialData !== null) {
      return () => {
        abortController.abort();
      };
    }

    async function loadModelDetail() {
      try {
        const result = await fetchModelDetailData(familySlugOrLegacyId, abortController.signal);
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        if (result.status === 'ok') {
          setData(result.data);
          return;
        }

        setData(null);
        setError(result.error);
      } catch {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setData(null);
        setError('Failed to load model');
      } finally {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setLoading(false);
      }
    }

    void loadModelDetail();

    return () => {
      abortController.abort();
    };
  }, [familySlugOrLegacyId, initialData]);

  return {
    data,
    loading,
    error
  };
}
