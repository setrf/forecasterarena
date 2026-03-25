'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchDecisionDetailData } from '@/features/decisions/detail/api';
import type { DecisionDetailData } from '@/features/decisions/detail/types';

export function useDecisionDetailData(
  decisionId: string,
  initialData: DecisionDetailData | null = null
) {
  const [data, setData] = useState<DecisionDetailData | null>(initialData);
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

    async function loadDecisionDetail() {
      try {
        const result = await fetchDecisionDetailData(decisionId, abortController.signal);
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        if (result.status === 'error') {
          setData(null);
          setError(result.error);
          return;
        }

        setData(result.data);
      } catch {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setData(null);
        setError('Failed to load decision');
      } finally {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setLoading(false);
      }
    }

    void loadDecisionDetail();

    return () => {
      abortController.abort();
    };
  }, [decisionId, initialData]);

  return {
    data,
    loading,
    error
  };
}
