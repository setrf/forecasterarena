import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { BASELINE } from '@/components/charts/performance/constants';
import { EmptyPerformanceState } from '@/components/charts/performance/EmptyPerformanceState';
import {
  formatPerformanceCurrency,
  formatPerformanceDateShort,
  formatPerformancePercentAxis
} from '@/components/charts/performance/formatters';
import { InteractiveLegend } from '@/components/charts/performance/InteractiveLegend';
import { PremiumTooltip } from '@/components/charts/performance/PremiumTooltip';
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
  toggleShowPercent,
  yDomain
}: PerformanceChartViewProps) {
  if (data.length === 0) {
    return <EmptyPerformanceState height={height} />;
  }

  return (
    <div className="relative">
      <div className="absolute top-0 right-0 z-10">
        <button
          onClick={toggleShowPercent}
          className={`
            px-3 py-1.5 text-xs font-mono rounded-lg transition-all
            ${showPercent
              ? 'bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/30'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-secondary)]'
            }
          `}
        >
          {showPercent ? '% Return' : '$ Value'}
        </button>
      </div>

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

          <ReferenceLine
            y={BASELINE}
            stroke="var(--text-muted)"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: showPercent ? '0% (Break Even)' : '$10,000',
              position: 'left',
              fill: 'var(--text-muted)',
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace'
            }}
          />

          {sundayMarkers.slice(0, 8).map((dateStr, index) => (
            <ReferenceLine
              key={dateStr}
              x={dateStr}
              stroke="var(--accent-gold)"
              strokeDasharray="2 4"
              strokeWidth={1}
              opacity={0.3}
              label={index === 0 ? {
                value: '↓ Decision Days',
                position: 'insideTop',
                fill: 'var(--accent-gold)',
                fontSize: 9,
                fontFamily: 'JetBrains Mono, monospace',
                opacity: 0.6,
                offset: 15
              } : undefined}
            />
          ))}

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

      {isolatedModel && isolatedModelName && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-3 py-1 rounded-full">
          Showing only {isolatedModelName} • Click again to show all
        </div>
      )}
    </div>
  );
}
