'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchCohortsPageData } from '@/features/cohorts/list/api';
import { CohortCardsSection } from '@/features/cohorts/list/components/CohortCardsSection';
import { CohortHowItWorks } from '@/features/cohorts/list/components/CohortHowItWorks';
import { CohortsHero } from '@/features/cohorts/list/components/CohortsHero';
import type { CohortSummary } from '@/features/cohorts/list/types';
import { getNextSundayLabel } from '@/features/cohorts/list/utils';

export default function CohortsPageClient() {
  const [cohorts, setCohorts] = useState<CohortSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const abortController = new AbortController();

    async function fetchCohorts() {
      try {
        const result = await fetchCohortsPageData(abortController.signal);
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        if (result.status === 'error') {
          setCohorts([]);
          setError(result.error);
          return;
        }

        setCohorts(result.data);
        setError(null);
      } catch {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setCohorts([]);
        setError('Failed to load cohorts.');
      } finally {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setLoading(false);
      }
    }

    void fetchCohorts();

    return () => {
      abortController.abort();
    };
  }, []);

  const decisionCohorts = useMemo(
    () => cohorts.filter((cohort) => !cohort.is_archived && cohort.decision_status === 'decisioning'),
    [cohorts]
  );
  const resolvingCohorts = useMemo(
    () => cohorts.filter((cohort) => !cohort.is_archived && cohort.decision_status === 'tracking_only'),
    [cohorts]
  );
  const completedCohorts = useMemo(
    () => cohorts.filter((cohort) => !cohort.is_archived && cohort.status === 'completed'),
    [cohorts]
  );
  const archivedCohorts = useMemo(
    () => cohorts.filter((cohort) => cohort.is_archived),
    [cohorts]
  );
  const nextSundayLabel = useMemo(() => getNextSundayLabel(), []);

  return (
    <div className="min-h-screen">
      <CohortsHero nextSundayLabel={nextSundayLabel} />

      <section className="container-wide mx-auto px-6 py-12">
        {error && (
          <div className="mb-8 rounded-xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm text-[var(--accent-rose)]">
            {error}
          </div>
        )}

        <CohortCardsSection
          title="Decision Cohorts"
          cohorts={decisionCohorts}
          loading={loading}
          emptyTitle="No Decision Cohorts"
          emptyDescription={`Next cohort starts ${nextSundayLabel}; decisions begin at 00:05 UTC`}
          variant="decisioning"
        />

        <CohortCardsSection
          title="Resolving Cohorts"
          cohorts={resolvingCohorts}
          loading={loading}
          emptyTitle="No Resolving Cohorts"
          emptyDescription="Older active cohorts will appear here after they leave the latest decision window"
          variant="resolving"
        />

        <CohortCardsSection
          title="Completed Cohorts"
          cohorts={completedCohorts}
          loading={loading}
          emptyTitle="No Completed Cohorts"
          emptyDescription="Past cohorts will appear here after all bets resolve"
          variant="completed"
        />

        <CohortCardsSection
          title="Archived v1"
          cohorts={archivedCohorts}
          loading={loading}
          emptyTitle="No Archived Cohorts"
          emptyDescription="Historical v1 cohorts will appear here after archival"
          variant="archived"
        />

        <CohortHowItWorks />
      </section>
    </div>
  );
}
