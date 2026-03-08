'use client';

import { useEffect, useState } from 'react';
import { fetchAgentCohortDetailData } from '@/features/cohorts/model-detail/api';
import type { AgentCohortData } from '@/features/cohorts/model-detail/types';

export function useAgentCohortDetailData(cohortId: string, familySlugOrLegacyId: string) {
  const [data, setData] = useState<AgentCohortData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadAgentCohortDetail() {
      try {
        const result = await fetchAgentCohortDetailData(cohortId, familySlugOrLegacyId);
        if (isCancelled) {
          return;
        }

        if (result.status === 'error') {
          setError(result.error);
          return;
        }

        setData(result.data);
      } catch (fetchError) {
        if (!isCancelled) {
          setError('Failed to load data');
          console.error(fetchError);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadAgentCohortDetail();

    return () => {
      isCancelled = true;
    };
  }, [cohortId, familySlugOrLegacyId]);

  return {
    data,
    loading,
    error
  };
}
