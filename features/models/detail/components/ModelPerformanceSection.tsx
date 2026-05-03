import { PerformanceChartPanel } from '@/components/charts/PerformanceChartPanel';
import type { TimeRange } from '@/components/charts/TimeRangeSelector';
import type { ReleaseChangeEvent } from '@/features/models/detail/types';

interface ModelPerformanceSectionProps {
  chartData: Array<{ date: string; [key: string]: string | number }>;
  chartModels: Array<{ id: string; name: string; color: string; currentReleaseName?: string | null }>;
  releaseChanges: ReleaseChangeEvent[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

export function ModelPerformanceSection({
  chartData,
  chartModels,
  releaseChanges,
  timeRange,
  onTimeRangeChange
}: ModelPerformanceSectionProps) {
  return (
    <PerformanceChartPanel
      title="Portfolio Value Over Time"
      chartData={chartData}
      chartModels={chartModels}
      releaseChanges={releaseChanges}
      timeRange={timeRange}
      onTimeRangeChange={onTimeRangeChange}
      height={280}
      showLegend={false}
      className="mb-10"
    />
  );
}
