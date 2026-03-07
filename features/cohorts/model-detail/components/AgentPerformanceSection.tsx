import PerformanceChart from '@/components/charts/PerformanceChart';
import TimeRangeSelector, { type TimeRange } from '@/components/charts/TimeRangeSelector';

interface AgentPerformanceSectionProps {
  chartData: Array<{ date: string; [key: string]: string | number }>;
  chartModels: Array<{ id: string; name: string; color: string }>;
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
}

export function AgentPerformanceSection({
  chartData,
  chartModels,
  timeRange,
  onTimeRangeChange
}: AgentPerformanceSectionProps) {
  return (
    <div className="chart-container mb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h3 className="text-lg font-semibold">Portfolio Value Over Time</h3>
        <TimeRangeSelector selected={timeRange} onChange={onTimeRangeChange} />
      </div>
      <PerformanceChart
        data={chartData}
        models={chartModels}
        height={520}
        showLegend={false}
        timeRange={timeRange}
      />
    </div>
  );
}
