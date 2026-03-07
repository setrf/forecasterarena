import type { CostByModel, CostSummary } from '@/features/admin/costs/types';

interface AdminCostsPayload {
  costs_by_model?: CostByModel[];
  summary?: CostSummary | null;
}

export async function fetchAdminCostsData(): Promise<{
  costsByModel: CostByModel[];
  summary: CostSummary | null;
}> {
  const response = await fetch('/api/admin/costs');
  if (!response.ok) {
    throw new Error('Failed to load admin costs');
  }

  const payload = await response.json() as AdminCostsPayload;
  return {
    costsByModel: payload.costs_by_model || [],
    summary: payload.summary || null
  };
}
