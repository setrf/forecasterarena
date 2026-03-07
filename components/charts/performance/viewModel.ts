import type {
  ModelConfig,
  PerformanceDataPoint,
  TimeRange
} from '@/components/charts/performance/types';
import {
  calculatePerformanceYDomain,
  filterPerformanceData,
  getPerformanceSummary,
  getSundayMarkers
} from '@/components/charts/performance/utils';

export interface PerformanceChartViewModel {
  filteredData: PerformanceDataPoint[];
  leaderId: string | null;
  latestValues: Record<string, number>;
  previousValues: Record<string, number>;
  yDomain: [number, number];
  sundayMarkers: string[];
  displayModels: ModelConfig[];
  isolatedModelName: string | null;
}

export function buildPerformanceChartViewModel(args: {
  data: PerformanceDataPoint[];
  models: ModelConfig[];
  timeRange: TimeRange;
  isolatedModel: string | null;
}): PerformanceChartViewModel {
  const filteredData = filterPerformanceData(args.data, args.timeRange);
  const { leaderId, latestValues, previousValues } = getPerformanceSummary(filteredData, args.models);

  return {
    filteredData,
    leaderId,
    latestValues,
    previousValues,
    yDomain: calculatePerformanceYDomain(filteredData, args.models),
    sundayMarkers: getSundayMarkers(filteredData),
    displayModels: getDisplayModels(args.models, args.isolatedModel),
    isolatedModelName: getIsolatedModelName(args.models, args.isolatedModel)
  };
}

export function getDisplayModels(
  models: ModelConfig[],
  isolatedModel: string | null
): ModelConfig[] {
  if (!isolatedModel) {
    return models;
  }

  return models.filter((model) => model.id === isolatedModel);
}

export function getIsolatedModelName(
  models: ModelConfig[],
  isolatedModel: string | null
): string | null {
  if (!isolatedModel) {
    return null;
  }

  return models.find((model) => model.id === isolatedModel)?.name ?? null;
}
