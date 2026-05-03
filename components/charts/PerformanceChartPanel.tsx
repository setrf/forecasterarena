'use client';

import PerformanceChart from '@/components/charts/PerformanceChart';
import TimeRangeSelector, { type TimeRange } from '@/components/charts/TimeRangeSelector';
import type { ReleaseChangeEvent } from '@/components/charts/performance/types';

interface PerformanceChartPanelProps {
  title: string;
  chartData: Array<{ date: string; [seriesKey: string]: string | number }>;
  chartModels: Array<{ id: string; name: string; color: string; currentReleaseName?: string | null }>;
  releaseChanges: ReleaseChangeEvent[];
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  height: number;
  showLegend: boolean;
  className?: string;
}

export function PerformanceChartPanel({
  title,
  chartData,
  chartModels,
  releaseChanges,
  timeRange,
  onTimeRangeChange,
  height,
  showLegend,
  className
}: PerformanceChartPanelProps) {
  return (
    <div className={['chart-container', className].filter(Boolean).join(' ')}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h3 className="heading-card">{title}</h3>
        <TimeRangeSelector selected={timeRange} onChange={onTimeRangeChange} />
      </div>
      <PerformanceChart
        data={chartData}
        models={chartModels}
        releaseChanges={releaseChanges}
        height={height}
        showLegend={showLegend}
        timeRange={timeRange}
      />
    </div>
  );
}
