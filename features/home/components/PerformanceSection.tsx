'use client';

import PerformanceChart from '@/components/charts/PerformanceChart';
import type { ReleaseChangeEvent } from '@/components/charts/performance/types';
import TimeRangeSelector, { TimeRange } from '@/components/charts/TimeRangeSelector';
import { SectionHeading } from '@/components/ui/SectionHeading';
import type { CatalogModel } from '@/features/home/types';

interface PerformanceSectionProps {
  chartData: Array<{ date: string; [key: string]: number | string }>;
  models: CatalogModel[];
  releaseChanges: ReleaseChangeEvent[];
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  error: string | null;
}

export function PerformanceSection({
  chartData,
  models,
  releaseChanges,
  timeRange,
  onTimeRangeChange,
  error,
}: PerformanceSectionProps) {
  const modelConfigs = models.map((model) => ({
    id: model.slug ?? model.id,
    name: model.displayName,
    color: model.color,
    currentReleaseName: model.currentReleaseName ?? null
  }));

  return (
    <section className="container-wide mx-auto px-6 py-8 md:py-10">
      <div className="chart-container">
        <SectionHeading
          eyebrow="Performance"
          title="Portfolio Value Over Time"
          description="Release-aware trend view across the live benchmark lineup."
          action={<TimeRangeSelector selected={timeRange} onChange={onTimeRangeChange} />}
        />

        {error && (
          <div className="mb-4 rounded-xl border border-[rgba(251,113,133,0.3)] bg-[rgba(251,113,133,0.08)] px-4 py-3" role="status" aria-live="polite">
            <p className="text-sm text-[var(--accent-rose)]">{error}</p>
          </div>
        )}

        <PerformanceChart
          data={chartData}
          models={modelConfigs}
          releaseChanges={releaseChanges}
          height={380}
          showLegend={true}
          timeRange={timeRange}
        />
      </div>
    </section>
  );
}
