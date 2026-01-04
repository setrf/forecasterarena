'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

interface ModelConfig {
  id: string;
  name: string;
  color: string;
}

export type TimeRange = '10M' | '1H' | '1D' | '1W' | '1M' | '3M' | 'ALL';

interface PerformanceChartProps {
  data: Array<{
    date: string;
    [modelId: string]: number | string;
  }>;
  models: ModelConfig[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  timeRange?: TimeRange;
}

const BASELINE = 10000;

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatPercent(value: number): string {
  const pct = ((value - BASELINE) / BASELINE) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function formatPercentAxis(value: number): string {
  const pct = ((value - BASELINE) / BASELINE) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(0)}%`;
}

/**
 * Parse UTC timestamp from DB format (YYYY-MM-DD HH:MM:SS) or ISO 8601
 */
function parseUTCTimestamp(dateStr: string): Date {
  if (dateStr.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  return new Date(dateStr.replace(' ', 'T') + 'Z');
}

function formatDateTime(dateStr: string): string {
  const date = parseUTCTimestamp(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function formatDateShort(dateStr: string): string {
  const date = parseUTCTimestamp(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
  models: ModelConfig[];
  showPercent: boolean;
  previousData?: { [key: string]: number };
}

function PremiumTooltip({ active, payload, label, models, showPercent, previousData }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const sortedPayload = [...payload]
    .filter(p => typeof p.value === 'number')
    .sort((a, b) => b.value - a.value);

  // Calculate previous rankings for trend indicators
  const previousRanks: { [key: string]: number } = {};
  if (previousData) {
    const sortedPrev = Object.entries(previousData)
      .filter(([, v]) => typeof v === 'number')
      .sort(([, a], [, b]) => b - a);
    sortedPrev.forEach(([key], idx) => {
      previousRanks[key] = idx + 1;
    });
  }

  return (
    <div className="bg-[#0a0a10]/95 backdrop-blur-xl border border-[var(--border-medium)] rounded-xl p-4 shadow-2xl min-w-[280px]">
      {/* Header with date */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border-subtle)]">
        <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
          {formatDateTime(label || '')}
        </span>
        <span className="text-[10px] font-mono text-[var(--accent-gold)] uppercase tracking-widest">
          Live Rankings
        </span>
      </div>

      {/* Rankings */}
      <div className="space-y-2">
        {sortedPayload.map((entry, index) => {
          const model = models.find(m => m.id === entry.name);
          const pnl = entry.value - BASELINE;
          const pnlPercent = (pnl / BASELINE) * 100;
          const rank = index + 1;
          const prevRank = previousRanks[entry.name];
          const rankChange = prevRank ? prevRank - rank : 0;

          return (
            <div
              key={entry.name}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                rank === 1 ? 'bg-[var(--accent-gold)]/10' : 'hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {/* Rank badge */}
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                  rank === 1
                    ? 'bg-[var(--accent-gold)] text-black'
                    : rank === 2
                      ? 'bg-[var(--text-muted)]/30 text-[var(--text-secondary)]'
                      : rank === 3
                        ? 'bg-[#cd7f32]/30 text-[#cd7f32]'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                }`}
              >
                {rank}
              </div>

              {/* Model color indicator */}
              <div
                className="w-2 h-8 rounded-full"
                style={{ backgroundColor: entry.color }}
              />

              {/* Model name and values */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium truncate ${rank === 1 ? 'text-[var(--accent-gold)]' : 'text-[var(--text-primary)]'}`}>
                    {model?.name || entry.name}
                  </span>
                  {/* Rank change indicator */}
                  {rankChange !== 0 && (
                    <span className={`text-[10px] font-mono ${rankChange > 0 ? 'text-positive' : 'text-negative'}`}>
                      {rankChange > 0 ? `↑${rankChange}` : `↓${Math.abs(rankChange)}`}
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {model?.name?.split(' ')[0] || 'Model'}
                </div>
              </div>

              {/* Value display */}
              <div className="text-right">
                <div className="font-mono text-sm font-medium">
                  {showPercent ? formatPercent(entry.value) : formatCurrency(entry.value)}
                </div>
                <div className={`text-xs font-mono ${pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer insight */}
      {sortedPayload.length > 1 && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">Spread (1st - Last)</span>
            <span className="font-mono text-[var(--accent-gold)]">
              {formatCurrency(sortedPayload[0].value - sortedPayload[sortedPayload.length - 1].value)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface LegendProps {
  models: ModelConfig[];
  latestValues: { [key: string]: number };
  highlightedModel: string | null;
  onModelHover: (modelId: string | null) => void;
  onModelClick: (modelId: string) => void;
  isolatedModel: string | null;
  leaderId: string | null;
  showPercent: boolean;
}

function InteractiveLegend({
  models,
  latestValues,
  highlightedModel,
  onModelHover,
  onModelClick,
  isolatedModel,
  leaderId,
  showPercent
}: LegendProps) {
  // Sort models by current value
  const sortedModels = [...models].sort((a, b) => {
    const aVal = latestValues[a.id] || BASELINE;
    const bVal = latestValues[b.id] || BASELINE;
    return bVal - aVal;
  });

  return (
    <div className="flex flex-wrap justify-center gap-x-1 gap-y-2 mt-4 px-2">
      {sortedModels.map((model, index) => {
        const value = latestValues[model.id] || BASELINE;
        const pnl = value - BASELINE;
        const isLeader = model.id === leaderId;
        const isIsolated = isolatedModel === model.id;
        const isHighlighted = highlightedModel === model.id;
        const isFaded = isolatedModel !== null && !isIsolated;

        return (
          <button
            key={model.id}
            onMouseEnter={() => onModelHover(model.id)}
            onMouseLeave={() => onModelHover(null)}
            onClick={() => onModelClick(model.id)}
            className={`
              group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200
              ${isHighlighted ? 'bg-[var(--bg-elevated)] scale-105' : 'hover:bg-[var(--bg-tertiary)]'}
              ${isFaded ? 'opacity-30' : 'opacity-100'}
              ${isIsolated ? 'ring-1 ring-[var(--accent-gold)]/50' : ''}
            `}
          >
            {/* Rank indicator */}
            <span className={`
              text-[10px] font-mono w-4 text-center
              ${isLeader ? 'text-[var(--accent-gold)]' : 'text-[var(--text-muted)]'}
            `}>
              {index + 1}
            </span>

            {/* Color dot with glow for leader */}
            <div className="relative">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-transform ${isHighlighted ? 'scale-125' : ''}`}
                style={{ backgroundColor: model.color }}
              />
              {isLeader && (
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-40"
                  style={{ backgroundColor: model.color }}
                />
              )}
            </div>

            {/* Model name */}
            <span className={`
              text-xs font-medium transition-colors
              ${isLeader ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}
            `}>
              {model.name}
            </span>

            {/* Current value/P&L */}
            <span className={`
              text-[10px] font-mono
              ${pnl >= 0 ? 'text-positive' : 'text-negative'}
            `}>
              {showPercent
                ? `${pnl >= 0 ? '+' : ''}${((pnl / BASELINE) * 100).toFixed(1)}%`
                : `${pnl >= 0 ? '+' : ''}${(pnl / 1000).toFixed(1)}k`
              }
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function PerformanceChart({
  data,
  models,
  height = 520,
  showLegend = true,
  showGrid = true,
  timeRange = '1M',
}: PerformanceChartProps) {
  const [highlightedModel, setHighlightedModel] = useState<string | null>(null);
  const [isolatedModel, setIsolatedModel] = useState<string | null>(null);
  const [showPercent, setShowPercent] = useState(false);

  const handleModelClick = useCallback((modelId: string) => {
    setIsolatedModel(prev => prev === modelId ? null : modelId);
  }, []);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (timeRange === 'ALL' || !data.length) return data;

    const now = new Date();
    const cutoffDate = new Date();

    switch (timeRange) {
      case '10M':
        cutoffDate.setMinutes(now.getMinutes() - 10);
        break;
      case '1H':
        cutoffDate.setHours(now.getHours() - 1);
        break;
      case '1D':
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case '1W':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
    }

    return data.filter(point => parseUTCTimestamp(point.date) >= cutoffDate);
  }, [data, timeRange]);

  // Find the current leader
  const { leaderId, latestValues, previousValues } = useMemo(() => {
    if (!filteredData.length) return { leaderId: null, latestValues: {}, previousValues: {} };

    const latest = filteredData[filteredData.length - 1];
    const previous = filteredData.length > 1 ? filteredData[filteredData.length - 2] : latest;

    let maxValue = -Infinity;
    let leader: string | null = null;
    const values: { [key: string]: number } = {};
    const prevValues: { [key: string]: number } = {};

    models.forEach(model => {
      const val = latest[model.id];
      const prevVal = previous[model.id];
      if (typeof val === 'number') {
        values[model.id] = val;
        if (val > maxValue) {
          maxValue = val;
          leader = model.id;
        }
      }
      if (typeof prevVal === 'number') {
        prevValues[model.id] = prevVal;
      }
    });

    return { leaderId: leader, latestValues: values, previousValues: prevValues };
  }, [filteredData, models]);

  // Calculate Y domain
  const yDomain = useMemo(() => {
    if (!filteredData.length) return [9000, 11000];

    let min = Infinity;
    let max = -Infinity;

    filteredData.forEach(point => {
      models.forEach(model => {
        const value = point[model.id];
        if (typeof value === 'number') {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      });
    });

    // Ensure baseline is always visible
    min = Math.min(min, BASELINE);
    max = Math.max(max, BASELINE);

    const padding = (max - min) * 0.1;
    return [
      Math.floor((min - padding) / 500) * 500,
      Math.ceil((max + padding) / 500) * 500
    ];
  }, [filteredData, models]);

  // Find Sunday markers (decision days)
  const sundayMarkers = useMemo(() => {
    if (!filteredData.length) return [];

    const sundays: string[] = [];
    let lastSunday: string | null = null;

    filteredData.forEach(point => {
      const date = parseUTCTimestamp(point.date);
      if (date.getUTCDay() === 0) {
        const dateStr = date.toISOString().split('T')[0];
        if (dateStr !== lastSunday) {
          sundays.push(point.date);
          lastSunday = dateStr;
        }
      }
    });

    return sundays;
  }, [filteredData]);

  // Models to display (considering isolation)
  const displayModels = useMemo(() => {
    if (isolatedModel) {
      return models.filter(m => m.id === isolatedModel);
    }
    return models;
  }, [models, isolatedModel]);

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl relative overflow-hidden"
        style={{ height }}
      >
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-primary)]" />
        <div className="absolute inset-0 dot-grid opacity-30" />

        {/* Animated placeholder lines */}
        <div className="absolute inset-0 flex items-end px-12 pb-20 opacity-10">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="flex-1 mx-1 rounded-t"
              style={{
                height: `${30 + Math.random() * 40}%`,
                background: `linear-gradient(to top, var(--accent-gold), transparent)`,
                animation: `pulse 2s ease-in-out infinite`,
                animationDelay: `${i * 200}ms`
              }}
            />
          ))}
        </div>

        <div className="relative text-center z-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center">
            <svg className="w-10 h-10 text-[var(--accent-gold)] opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <p className="text-xl font-medium text-[var(--text-secondary)] mb-2">Awaiting First Cohort</p>
          <p className="text-sm text-[var(--text-muted)]">Performance chart will appear once models begin trading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Value mode toggle */}
      <div className="absolute top-0 right-0 z-10">
        <button
          onClick={() => setShowPercent(!showPercent)}
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

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={filteredData} margin={{ top: 30, right: 30, left: 10, bottom: 5 }}>
          {/* Subtle grid */}
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
              vertical={false}
              opacity={0.3}
            />
          )}

          {/* Baseline reference */}
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

          {/* Sunday decision day markers */}
          {sundayMarkers.slice(0, 8).map((dateStr, i) => (
            <ReferenceLine
              key={dateStr}
              x={dateStr}
              stroke="var(--accent-gold)"
              strokeDasharray="2 4"
              strokeWidth={1}
              opacity={0.3}
              label={i === 0 ? {
                value: '↓ Decision Days',
                position: 'top',
                fill: 'var(--accent-gold)',
                fontSize: 9,
                fontFamily: 'JetBrains Mono, monospace',
                opacity: 0.6
              } : undefined}
            />
          ))}

          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
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
            tickFormatter={showPercent ? formatPercentAxis : formatCurrency}
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            width={70}
            tickCount={7}
          />

          <Tooltip
            content={
              <PremiumTooltip
                models={models}
                showPercent={showPercent}
                previousData={previousValues}
              />
            }
            cursor={{
              stroke: 'var(--accent-gold)',
              strokeWidth: 1,
              strokeDasharray: '4 4',
              opacity: 0.5
            }}
          />

          {/* Leader gradient area fill */}
          {leaderId && !isolatedModel && (
            <defs>
              <linearGradient id="leaderGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={models.find(m => m.id === leaderId)?.color || 'var(--accent-gold)'}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={models.find(m => m.id === leaderId)?.color || 'var(--accent-gold)'}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
          )}

          {leaderId && !isolatedModel && (
            <Area
              type="monotone"
              dataKey={leaderId}
              stroke="none"
              fill="url(#leaderGradient)"
              isAnimationActive={false}
            />
          )}

          {/* Model lines */}
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

      {/* Interactive Legend */}
      {showLegend && (
        <InteractiveLegend
          models={models}
          latestValues={latestValues}
          highlightedModel={highlightedModel}
          onModelHover={setHighlightedModel}
          onModelClick={handleModelClick}
          isolatedModel={isolatedModel}
          leaderId={leaderId}
          showPercent={showPercent}
        />
      )}

      {/* Isolation hint */}
      {isolatedModel && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-3 py-1 rounded-full">
          Showing only {models.find(m => m.id === isolatedModel)?.name} • Click again to show all
        </div>
      )}
    </div>
  );
}
