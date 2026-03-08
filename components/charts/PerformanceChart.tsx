'use client';

import { useCallback, useMemo, useState } from 'react';
import { PerformanceChartView } from '@/components/charts/performance/PerformanceChartView';
import type { PerformanceChartProps, TimeRange } from '@/components/charts/performance/types';
import { buildPerformanceChartViewModel } from '@/components/charts/performance/viewModel';

export type { TimeRange } from '@/components/charts/performance/types';

export default function PerformanceChart({
  data,
  models,
  releaseChanges = [],
  height = 520,
  showLegend = true,
  showGrid = true,
  timeRange = '1M'
}: PerformanceChartProps) {
  const [highlightedModel, setHighlightedModel] = useState<string | null>(null);
  const [isolatedModel, setIsolatedModel] = useState<string | null>(null);
  const [showPercent, setShowPercent] = useState(false);

  const handleModelClick = useCallback((modelId: string) => {
    setIsolatedModel((current) => current === modelId ? null : modelId);
  }, []);

  const viewModel = useMemo(() => buildPerformanceChartViewModel({
    data,
    models,
    releaseChanges,
    timeRange: timeRange as TimeRange,
    isolatedModel
  }), [data, isolatedModel, models, releaseChanges, timeRange]);

  return (
    <PerformanceChartView
      data={viewModel.filteredData}
      displayModels={viewModel.displayModels}
      height={height}
      highlightedModel={highlightedModel}
      isolatedModel={isolatedModel}
      isolatedModelName={viewModel.isolatedModelName}
      latestValues={viewModel.latestValues}
      leaderId={viewModel.leaderId}
      models={models}
      onModelClick={handleModelClick}
      onModelHover={setHighlightedModel}
      previousValues={viewModel.previousValues}
      showGrid={showGrid}
      showLegend={showLegend}
      showPercent={showPercent}
      sundayMarkers={viewModel.sundayMarkers}
      releaseMarkerDates={viewModel.releaseMarkerDates}
      visibleReleaseChanges={viewModel.visibleReleaseChanges}
      toggleShowPercent={() => setShowPercent((current) => !current)}
      yDomain={viewModel.yDomain}
    />
  );
}
