'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchAgentCohortDetailData } from '@/features/cohorts/model-detail/api';
import type { AgentCohortData } from '@/features/cohorts/model-detail/types';

export function useAgentCohortDetailData(
  cohortId: string,
  familySlugOrLegacyId: string,
  initialData: AgentCohortData | null = null
) {
  const [data, setData] = useState<AgentCohortData | null>(initialData);
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

    async function loadAgentCohortDetail() {
      try {
        const result = await fetchAgentCohortDetailData(
          cohortId,
          familySlugOrLegacyId,
          abortController.signal
        );
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
        setError('Failed to load data');
      } finally {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setLoading(false);
      }
    }

    void loadAgentCohortDetail();

    return () => {
      abortController.abort();
    };
  }, [cohortId, familySlugOrLegacyId, initialData]);

  return {
    data,
    loading,
    error
  };
}
