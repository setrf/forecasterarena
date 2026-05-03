import { PerformanceChartPanel } from '@/components/charts/PerformanceChartPanel';
import type { TimeRange } from '@/components/charts/TimeRangeSelector';
import type { ReleaseChangeEvent } from '@/features/cohorts/detail/types';

interface CohortPerformanceSectionProps {
  chartData: Array<{ date: string; [seriesKey: string]: string | number }>;
  chartModels: Array<{ id: string; name: string; color: string; currentReleaseName?: string | null }>;
  releaseChanges: ReleaseChangeEvent[];
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
}

export function CohortPerformanceSection({
  chartData,
  chartModels,
  releaseChanges,
  timeRange,
  onTimeRangeChange
}: CohortPerformanceSectionProps) {
  return (
    <PerformanceChartPanel
      title="Portfolio Performance"
      chartData={chartData}
      chartModels={chartModels}
      releaseChanges={releaseChanges}
      timeRange={timeRange}
      onTimeRangeChange={onTimeRangeChange}
      height={520}
      showLegend={true}
      className="mb-8"
    />
  );
}
