'use client';

import { MODELS } from '@/lib/constants';
import PerformanceChart from '@/components/charts/PerformanceChart';
import TimeRangeSelector, { TimeRange } from '@/components/charts/TimeRangeSelector';

interface PerformanceSectionProps {
  chartData: Array<{ date: string; [key: string]: number | string }>;
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  error: string | null;
}

export function PerformanceSection({
  chartData,
  timeRange,
  onTimeRangeChange,
  error,
}: PerformanceSectionProps) {
  const modelConfigs = MODELS.map((model) => ({
    id: model.id,
    name: model.displayName,
    color: model.color
  }));

  return (
    <section className="container-wide mx-auto px-6 py-8 md:py-10">
      <div className="chart-container">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <p className="text-[var(--accent-gold)] font-mono text-sm tracking-wider mb-2">PERFORMANCE</p>
            <h2 className="text-2xl md:text-3xl">Portfolio Value Over Time</h2>
          </div>
          <TimeRangeSelector selected={timeRange} onChange={onTimeRangeChange} />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-[rgba(251,113,133,0.3)] bg-[rgba(251,113,133,0.08)] px-4 py-3" role="status" aria-live="polite">
            <p className="text-sm text-[var(--accent-rose)]">{error}</p>
          </div>
        )}

        <PerformanceChart
          data={chartData}
          models={modelConfigs}
          height={380}
          showLegend={true}
          timeRange={timeRange}
        />
      </div>
    </section>
  );
}
