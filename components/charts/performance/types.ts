import type { TimeRange } from '@/components/charts/TimeRangeSelector';

export type { TimeRange };

export interface ReleaseChangeEvent {
  date: string;
  model_id: string;
  model_name: string;
  previous_release_name: string;
  release_name: string;
  color: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  color: string;
  currentReleaseName?: string | null;
}

export interface PerformanceDataPoint {
  date: string;
  [modelId: string]: number | string;
}

export interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  models: ModelConfig[];
  releaseChanges?: ReleaseChangeEvent[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  timeRange?: TimeRange;
}
