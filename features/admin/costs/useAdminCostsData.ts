'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchAdminCostsData } from '@/features/admin/costs/api';
import type { CostByModel, CostSummary } from '@/features/admin/costs/types';

export function useAdminCostsData() {
  const [costsByModel, setCostsByModel] = useState<CostByModel[]>([]);
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCosts() {
      try {
        const result = await fetchAdminCostsData();
        setCostsByModel(result.costsByModel);
        setSummary(result.summary);
        setError(null);
      } catch (error) {
        console.error('Error fetching costs:', error);
        setError(error instanceof Error && error.message === 'unauthorized'
          ? 'Admin authentication required to view cost data.'
          : 'Unable to load admin cost data right now.');
      } finally {
        setLoading(false);
      }
    }

    void loadCosts();
  }, []);

  const chartData = useMemo(
    () => [...costsByModel].sort((a, b) => b.total_cost - a.total_cost),
    [costsByModel]
  );

  return {
    costsByModel,
    summary,
    loading,
    error,
    chartData
  };
}
