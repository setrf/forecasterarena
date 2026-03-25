import PerformanceChart from '@/components/charts/PerformanceChart';
import TimeRangeSelector, { type TimeRange } from '@/components/charts/TimeRangeSelector';
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
    <div className="chart-container mb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h3 className="heading-card">Portfolio Value Over Time</h3>
        <TimeRangeSelector selected={timeRange} onChange={onTimeRangeChange} />
      </div>
      <PerformanceChart
        data={chartData}
        models={chartModels}
        releaseChanges={releaseChanges}
        height={280}
        showLegend={false}
        timeRange={timeRange}
      />
    </div>
  );
}
