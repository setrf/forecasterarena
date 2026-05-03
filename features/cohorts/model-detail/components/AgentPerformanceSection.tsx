import { PerformanceChartPanel } from '@/components/charts/PerformanceChartPanel';
import type { TimeRange } from '@/components/charts/TimeRangeSelector';
import type { ReleaseChangeEvent } from '@/features/cohorts/model-detail/types';

interface AgentPerformanceSectionProps {
  chartData: Array<{ date: string; [key: string]: string | number }>;
  chartModels: Array<{ id: string; name: string; color: string; currentReleaseName?: string | null }>;
  releaseChanges: ReleaseChangeEvent[];
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
}

export function AgentPerformanceSection({
  chartData,
  chartModels,
  releaseChanges,
  timeRange,
  onTimeRangeChange
}: AgentPerformanceSectionProps) {
  return (
    <PerformanceChartPanel
      title="Portfolio Value Over Time"
      chartData={chartData}
      chartModels={chartModels}
      releaseChanges={releaseChanges}
      timeRange={timeRange}
      onTimeRangeChange={onTimeRangeChange}
      height={520}
      showLegend={false}
      className="mb-10"
    />
  );
}
