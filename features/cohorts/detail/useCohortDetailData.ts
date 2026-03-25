'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchCohortDetailData } from '@/features/cohorts/detail/api';
import type {
  AgentStats,
  Cohort,
  CohortStats,
  Decision,
  ReleaseChangeEvent
} from '@/features/cohorts/detail/types';
import type { CohortDetailLoadResult } from '@/features/cohorts/detail/api';

type CohortDetailData = Extract<CohortDetailLoadResult, { status: 'ok' }>['data'];

export function useCohortDetailData(cohortId: string, initialData: CohortDetailData | null = null) {
  const [cohort, setCohort] = useState<Cohort | null>(initialData?.cohort ?? null);
  const [agents, setAgents] = useState<AgentStats[]>(initialData?.agents ?? []);
  const [stats, setStats] = useState<CohortStats | null>(initialData?.stats ?? null);
  const [equityCurves, setEquityCurves] = useState<Record<string, Array<{ date: string; value: number }>>>(initialData?.equityCurves ?? {});
  const [releaseChanges, setReleaseChanges] = useState<ReleaseChangeEvent[]>(initialData?.releaseChanges ?? []);
  const [decisions, setDecisions] = useState<Decision[]>(initialData?.decisions ?? []);
  const [loading, setLoading] = useState(initialData === null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const abortController = new AbortController();

    setCohort(initialData?.cohort ?? null);
    setAgents(initialData?.agents ?? []);
    setStats(initialData?.stats ?? null);
    setEquityCurves(initialData?.equityCurves ?? {});
    setReleaseChanges(initialData?.releaseChanges ?? []);
    setDecisions(initialData?.decisions ?? []);
    setError(null);
    setLoading(initialData === null);

    if (initialData !== null) {
      return () => {
        abortController.abort();
      };
    }

    async function loadCohortDetail() {
      try {
        const result = await fetchCohortDetailData(cohortId, abortController.signal);
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        if (result.status === 'error') {
          setCohort(null);
          setAgents([]);
          setStats(null);
          setEquityCurves({});
          setReleaseChanges([]);
          setDecisions([]);
          setError(result.error);
          return;
        }

        setCohort(result.data.cohort);
        setAgents(result.data.agents);
        setStats(result.data.stats);
        setEquityCurves(result.data.equityCurves);
        setReleaseChanges(result.data.releaseChanges);
        setDecisions(result.data.decisions);
      } catch {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setCohort(null);
        setAgents([]);
        setStats(null);
        setEquityCurves({});
        setReleaseChanges([]);
        setDecisions([]);
        setError('Failed to load cohort');
      } finally {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setLoading(false);
      }
    }

    void loadCohortDetail();

    return () => {
      abortController.abort();
    };
  }, [cohortId, initialData]);

  return {
    cohort,
    agents,
    stats,
    equityCurves,
    releaseChanges,
    decisions,
    loading,
    error
  };
}
