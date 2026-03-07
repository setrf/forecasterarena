'use client';

import { useEffect, useState } from 'react';
import { fetchDecisionDetailData } from '@/features/decisions/detail/api';
import type { DecisionDetailData } from '@/features/decisions/detail/types';

export function useDecisionDetailData(decisionId: string) {
  const [data, setData] = useState<DecisionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadDecisionDetail() {
      try {
        const result = await fetchDecisionDetailData(decisionId);
        if (isCancelled) {
          return;
        }

        if (result.status === 'error') {
          setError(result.error);
          return;
        }

        setData(result.data);
      } catch {
        if (!isCancelled) {
          setError('Failed to load decision');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadDecisionDetail();

    return () => {
      isCancelled = true;
    };
  }, [decisionId]);

  return {
    data,
    loading,
    error
  };
}
