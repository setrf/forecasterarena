import PerformanceChart from '@/components/charts/PerformanceChart';
import TimeRangeSelector, { type TimeRange } from '@/components/charts/TimeRangeSelector';

interface CohortPerformanceSectionProps {
  chartData: Array<{ date: string; [seriesKey: string]: string | number }>;
  chartModels: Array<{ id: string; name: string; color: string }>;
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
}

export function CohortPerformanceSection({
  chartData,
  chartModels,
  timeRange,
  onTimeRangeChange
}: CohortPerformanceSectionProps) {
  return (
    <div className="chart-container mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h3 className="text-lg font-semibold">Portfolio Performance</h3>
        <TimeRangeSelector selected={timeRange} onChange={onTimeRangeChange} />
      </div>
      <PerformanceChart
        data={chartData}
        models={chartModels}
        height={520}
        showLegend={true}
        timeRange={timeRange}
      />
    </div>
  );
}
