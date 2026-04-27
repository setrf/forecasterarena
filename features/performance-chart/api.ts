import type {
  ModelConfig,
  PerformanceDataPoint,
  ReleaseChangeEvent,
  TimeRange
} from '@/components/charts/performance/types';

interface PerformanceChartApiPayload {
  data?: PerformanceDataPoint[];
  models?: Array<ModelConfig & {
    displayName?: string;
    shortDisplayName?: string;
    currentReleaseName?: string | null;
  }>;
  release_changes?: ReleaseChangeEvent[];
}

export async function fetchPerformanceChartSeries(args: {
  timeRange: TimeRange;
  cohortId?: string | null;
  familyId?: string | null;
  signal?: AbortSignal;
}): Promise<{
  data: PerformanceDataPoint[];
  models: ModelConfig[];
  releaseChanges: ReleaseChangeEvent[];
}> {
  const params = new URLSearchParams({ range: args.timeRange });
  if (args.cohortId) {
    params.set('cohort_id', args.cohortId);
  }
  if (args.familyId) {
    params.set('family_id', args.familyId);
  }

  const response = await fetch(`/api/performance-data?${params.toString()}`, {
    signal: args.signal
  });
  if (!response.ok) {
    throw new Error('Performance chart data is temporarily unavailable.');
  }

  const json = await response.json() as PerformanceChartApiPayload;
  return {
    data: json.data ?? [],
    models: (json.models ?? []).map((model) => ({
      id: model.id,
      name: model.name ?? model.displayName ?? model.shortDisplayName ?? model.id,
      color: model.color,
      currentReleaseName: model.currentReleaseName ?? null
    })),
    releaseChanges: json.release_changes ?? []
  };
}
