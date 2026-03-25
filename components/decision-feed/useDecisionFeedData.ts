'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchRecentDecisions } from '@/components/decision-feed/api';
import type { DecisionFeedDecision } from '@/components/decision-feed/types';

interface UseDecisionFeedDataOptions {
  limit: number;
  autoRefresh: boolean;
  initialDecisions?: DecisionFeedDecision[];
}

export function useDecisionFeedData({
  limit,
  autoRefresh,
  initialDecisions
}: UseDecisionFeedDataOptions) {
  const [decisions, setDecisions] = useState<DecisionFeedDecision[]>(initialDecisions || []);
  const [loading, setLoading] = useState(!initialDecisions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialDecisions) {
      abortControllerRef.current?.abort();
      setDecisions(initialDecisions);
      setLoading(false);
      return;
    }

    async function loadDecisions() {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const recentDecisions = await fetchRecentDecisions(limit, abortController.signal);
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setDecisions(recentDecisions);
      } catch (error) {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        console.error('Error fetching decisions:', error);
      } finally {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setLoading(false);
      }
    }

    void loadDecisions();

    if (autoRefresh) {
      const intervalId = setInterval(() => {
        void loadDecisions();
      }, 30_000);
      return () => {
        clearInterval(intervalId);
        abortControllerRef.current?.abort();
      };
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [autoRefresh, initialDecisions, limit]);

  function toggleExpanded(id: string): void {
    setExpandedId((current) => (current === id ? null : id));
  }

  return {
    decisions,
    loading,
    expandedId,
    toggleExpanded
  };
}
