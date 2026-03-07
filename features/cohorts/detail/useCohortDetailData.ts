'use client';

import { useEffect, useState } from 'react';
import { fetchCohortDetailData } from '@/features/cohorts/detail/api';
import type {
  AgentStats,
  Cohort,
  CohortStats,
  Decision
} from '@/features/cohorts/detail/types';

export function useCohortDetailData(cohortId: string) {
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [equityCurves, setEquityCurves] = useState<Record<string, Array<{ date: string; value: number }>>>({});
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCohortDetail() {
      try {
        const result = await fetchCohortDetailData(cohortId);
        if (result.status === 'error') {
          setError(result.error);
          return;
        }

        setCohort(result.data.cohort);
        setAgents(result.data.agents);
        setStats(result.data.stats);
        setEquityCurves(result.data.equityCurves);
        setDecisions(result.data.decisions);
      } catch {
        setError('Failed to load cohort');
      } finally {
        setLoading(false);
      }
    }

    void loadCohortDetail();
  }, [cohortId]);

  return {
    cohort,
    agents,
    stats,
    equityCurves,
    decisions,
    loading,
    error
  };
}
