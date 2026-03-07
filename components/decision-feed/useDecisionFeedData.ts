'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (initialDecisions) {
      setDecisions(initialDecisions);
      setLoading(false);
      return;
    }

    async function loadDecisions() {
      try {
        const recentDecisions = await fetchRecentDecisions(limit);
        setDecisions(recentDecisions);
      } catch (error) {
        console.error('Error fetching decisions:', error);
      } finally {
        setLoading(false);
      }
    }

    void loadDecisions();

    if (autoRefresh) {
      const intervalId = setInterval(() => {
        void loadDecisions();
      }, 30_000);
      return () => clearInterval(intervalId);
    }
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
