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

interface PerformanceChartProps {
  data: Array<{
    date: string;
    [modelId: string]: number | string;
  }>;
  models: ModelConfig[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      <p className="text-sm text-[var(--text-muted)] mb-2">{formatDate(label || '')}</p>
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
  height = 400,
  showLegend = true,
  showGrid = true,
}: PerformanceChartProps) {
  const yDomain = useMemo(() => {
    if (!data.length) return [8000, 12000];
    
    let min = Infinity;
    let max = -Infinity;
    
    data.forEach(point => {
      models.forEach(model => {
        const value = point[model.id];
        if (typeof value === 'number') {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      });
    });
    
    const padding = (max - min) * 0.1;
    return [Math.floor((min - padding) / 1000) * 1000, Math.ceil((max + padding) / 1000) * 1000];
  }, [data, models]);

  if (!data.length) {
    return (
      <div 
        className="flex items-center justify-center text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-lg"
        style={{ height }}
      >
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <p>No performance data yet</p>
          <p className="text-sm mt-1">Chart will appear after the first cohort runs</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="var(--border-subtle)" 
            vertical={false}
          />
        )}
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="var(--text-muted)"
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--border-subtle)' }}
          tickLine={{ stroke: 'var(--border-subtle)' }}
        />
        <YAxis
          domain={yDomain}
          tickFormatter={formatCurrency}
          stroke="var(--text-muted)"
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--border-subtle)' }}
          tickLine={{ stroke: 'var(--border-subtle)' }}
          width={70}
        />
        <Tooltip content={<CustomTooltip models={models} />} />
        {showLegend && (
          <Legend
            wrapperStyle={{ paddingTop: 20 }}
            formatter={(value) => {
              const model = models.find(m => m.id === value);
              return <span className="text-sm text-[var(--text-secondary)]">{model?.name || value}</span>;
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
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

