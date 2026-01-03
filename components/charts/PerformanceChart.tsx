'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * Parse UTC timestamp from DB format (YYYY-MM-DD HH:MM:SS) or ISO 8601
 * DB stores timestamps in UTC without timezone indicator.
 */
function parseUTCTimestamp(dateStr: string): Date {
  if (dateStr.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  return new Date(dateStr.replace(' ', 'T') + 'Z');
}

function formatDate(dateStr: string): string {
  const date = parseUTCTimestamp(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  models: ModelConfig[];
}

function CustomTooltip({ active, payload, label, models }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg p-3 shadow-xl">
      <p className="text-sm text-[var(--text-muted)] mb-2">{formatDateTime(label || '')}</p>
      <div className="space-y-1">
        {sortedPayload.map((entry) => {
          const model = models.find(m => m.id === entry.name);
          const pnl = entry.value - 10000;
          const pnlPercent = ((pnl / 10000) * 100).toFixed(1);
          return (
            <div key={entry.name} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[var(--text-secondary)]">
                  {model?.name || entry.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono">{formatCurrency(entry.value)}</span>
                <span className={`font-mono text-xs ${pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                  ({pnl >= 0 ? '+' : ''}{pnlPercent}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
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

  const yDomain = useMemo(() => {
    if (!filteredData.length) return [8000, 12000];
    
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

    const padding = (max - min) * 0.05;
    return [Math.floor((min - padding) / 100) * 100, Math.ceil((max + padding) / 100) * 100];
  }, [filteredData, models]);

  if (!data.length) {
    return (
      <div 
        className="flex items-center justify-center rounded-lg relative overflow-hidden"
        style={{ height }}
      >
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-primary)]" />
        <div className="absolute inset-0 dot-grid opacity-30" />
        
        {/* Animated placeholder lines */}
        <div className="absolute inset-0 flex items-end px-8 pb-16 opacity-10">
          {[...Array(7)].map((_, i) => (
            <div 
              key={i}
              className="flex-1 mx-1 bg-gradient-to-t from-[var(--accent-gold)] to-transparent rounded-t animate-pulse"
              style={{ 
                height: `${30 + Math.random() * 40}%`,
                animationDelay: `${i * 150}ms`
              }}
            />
          ))}
        </div>
        
        <div className="relative text-center z-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--accent-gold)] opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <p className="text-lg font-medium text-[var(--text-secondary)]">Awaiting First Cohort</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Performance chart will appear once models begin trading</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={filteredData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-subtle)"
            vertical={false}
            opacity={0.5}
          />
        )}
        <XAxis
          dataKey="date"
          tickFormatter={formatDateTime}
          stroke="var(--text-muted)"
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          axisLine={{ stroke: 'var(--border-subtle)' }}
          tickLine={false}
          angle={-35}
          textAnchor="end"
          height={70}
          minTickGap={40}
        />
        <YAxis
          domain={yDomain}
          tickFormatter={formatCurrency}
          stroke="var(--text-muted)"
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={65}
        />
        <Tooltip content={<CustomTooltip models={models} />} />
        {showLegend && (
          <Legend
            wrapperStyle={{ paddingTop: 16 }}
            iconType="circle"
            iconSize={8}
            formatter={(value) => {
              const model = models.find(m => m.id === value);
              return <span className="text-xs text-[var(--text-secondary)]">{model?.name || value}</span>;
            }}
          />
        )}
        {models.map((model) => (
          <Line
            key={model.id}
            type="monotone"
            dataKey={model.id}
            name={model.id}
            stroke={model.color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--bg-card)', fill: model.color }}
            strokeOpacity={0.9}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}


