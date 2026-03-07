'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchAdminCostsData } from '@/features/admin/costs/api';
import type { CostByModel, CostSummary } from '@/features/admin/costs/types';

export function useAdminCostsData() {
  const [costsByModel, setCostsByModel] = useState<CostByModel[]>([]);
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCosts() {
      try {
        const result = await fetchAdminCostsData();
        setCostsByModel(result.costsByModel);
        setSummary(result.summary);
      } catch (error) {
        console.error('Error fetching costs:', error);
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
    chartData
  };
}
