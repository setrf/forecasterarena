import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { EmptyPerformanceState } from '@/components/charts/performance/EmptyPerformanceState';
import { PerformanceChartControls } from '@/components/charts/performance/PerformanceChartControls';
import {
  formatPerformanceCurrency,
  formatPerformanceDateShort,
  formatPerformancePercentAxis
} from '@/components/charts/performance/formatters';
import { InteractiveLegend } from '@/components/charts/performance/InteractiveLegend';
import { PremiumTooltip } from '@/components/charts/performance/PremiumTooltip';
import { PerformanceReferenceLines } from '@/components/charts/performance/PerformanceReferenceLines';
import { ReleaseShiftStrip } from '@/components/charts/performance/ReleaseShiftStrip';
import type { ModelConfig, PerformanceDataPoint } from '@/components/charts/performance/types';

interface PerformanceChartViewProps {
  data: PerformanceDataPoint[];
  displayModels: ModelConfig[];
  height: number;
  highlightedModel: string | null;
  isolatedModel: string | null;
  isolatedModelName: string | null;
  latestValues: Record<string, number>;
  leaderId: string | null;
  models: ModelConfig[];
  onModelClick: (modelId: string) => void;
  onModelHover: (modelId: string | null) => void;
  previousValues: Record<string, number>;
  showGrid: boolean;
  showLegend: boolean;
  showPercent: boolean;
  sundayMarkers: string[];
  releaseMarkerDates: string[];
  visibleReleaseChanges: Array<{
    date: string;
    model_id: string;
    model_name: string;
    release_name: string;
    color: string;
  }>;
  toggleShowPercent: () => void;
  yDomain: [number, number];
}

export function PerformanceChartView({
  data,
  displayModels,
  height,
  highlightedModel,
  isolatedModel,
  isolatedModelName,
  latestValues,
  leaderId,
  models,
  onModelClick,
  onModelHover,
  previousValues,
  showGrid,
  showLegend,
  showPercent,
  sundayMarkers,
  releaseMarkerDates,
  visibleReleaseChanges,
  toggleShowPercent,
  yDomain
}: PerformanceChartViewProps) {
  if (data.length === 0) {
    return <EmptyPerformanceState height={height} />;
  }

  return (
    <div className="relative">
      <PerformanceChartControls
        isolatedModel={isolatedModel}
        isolatedModelName={isolatedModelName}
        showPercent={showPercent}
        toggleShowPercent={toggleShowPercent}
      />

      <ReleaseShiftStrip releaseChanges={visibleReleaseChanges} />

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 30, right: 30, left: 10, bottom: 5 }}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
              vertical={false}
              opacity={0.3}
            />
          )}

          <PerformanceReferenceLines
            showPercent={showPercent}
            sundayMarkers={sundayMarkers}
            releaseMarkerDates={releaseMarkerDates}
          />

          <XAxis
            dataKey="date"
            tickFormatter={formatPerformanceDateShort}
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={{ stroke: 'var(--border-subtle)', strokeWidth: 1 }}
            tickLine={false}
            height={50}
            minTickGap={60}
            dy={10}
          />

          <YAxis
            domain={yDomain}
            tickFormatter={showPercent ? formatPerformancePercentAxis : formatPerformanceCurrency}
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            width={70}
            tickCount={7}
          />

          <Tooltip
            content={(
              <PremiumTooltip
                models={models}
                showPercent={showPercent}
                previousData={previousValues}
              />
            )}
            cursor={{
              stroke: 'var(--accent-gold)',
              strokeWidth: 1,
              strokeDasharray: '4 4',
              opacity: 0.5
            }}
          />

          {displayModels.map((model) => {
            const isLeader = model.id === leaderId && !isolatedModel;
            const isHighlighted = highlightedModel === model.id;
            const isFaded = highlightedModel !== null && !isHighlighted;

            return (
              <Line
                key={model.id}
                type="monotone"
                dataKey={model.id}
                name={model.id}
                stroke={model.color}
                strokeWidth={isLeader ? 3 : isHighlighted ? 2.5 : 1.5}
                dot={false}
                activeDot={{
                  r: isLeader ? 6 : 4,
                  strokeWidth: 2,
                  stroke: 'var(--bg-card)',
                  fill: model.color,
                  className: isLeader ? 'drop-shadow-lg' : ''
                }}
                strokeOpacity={isFaded ? 0.2 : isLeader ? 1 : 0.85}
                isAnimationActive={true}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>

      {showLegend && (
        <InteractiveLegend
          models={models}
          latestValues={latestValues}
          highlightedModel={highlightedModel}
          onModelHover={onModelHover}
          onModelClick={onModelClick}
          isolatedModel={isolatedModel}
          leaderId={leaderId}
          showPercent={showPercent}
        />
      )}
    </div>
  );
}
