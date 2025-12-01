'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

interface PnLData {
  model_id: string;
  model_name: string;
  color: string;
  pnl: number;
  pnl_percent: number;
}

interface PnLBarChartProps {
  data: PnLData[];
  height?: number;
  showPercent?: boolean;
  horizontal?: boolean;
}

function formatCurrency(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PnLData }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg p-3 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <span className="font-medium">{data.model_name}</span>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-muted)]">P/L:</span>
          <span className={`font-mono ${data.pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatCurrency(data.pnl)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-muted)]">Return:</span>
          <span className={`font-mono ${data.pnl_percent >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatPercent(data.pnl_percent)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PnLBarChart({
  data,
  height = 300,
  showPercent = false,
  horizontal = true,
}: PnLBarChartProps) {
  // Sort by P/L descending
  const sortedData = [...data].sort((a, b) => b.pnl - a.pnl);

  if (!data.length) {
    return (
      <div 
        className="flex items-center justify-center text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-lg"
        style={{ height }}
      >
        <p>No P/L data available</p>
      </div>
    );
  }

  const dataKey = showPercent ? 'pnl_percent' : 'pnl';
  const formatter = showPercent ? formatPercent : formatCurrency;

  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="var(--border-subtle)" 
            horizontal={false}
          />
          <XAxis
            type="number"
            tickFormatter={formatter}
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--border-subtle)' }}
          />
          <YAxis
            type="category"
            dataKey="model_name"
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            width={75}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={0} stroke="var(--text-muted)" strokeDasharray="3 3" />
          <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
            {sortedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.pnl >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sortedData} margin={{ top: 5, right: 5, left: 5, bottom: 50 }}>
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="var(--border-subtle)" 
          vertical={false}
        />
        <XAxis
          dataKey="model_name"
          stroke="var(--text-muted)"
          tick={{ fill: 'var(--text-muted)', fontSize: 11, angle: -45, textAnchor: 'end' }}
          axisLine={{ stroke: 'var(--border-subtle)' }}
          height={60}
        />
        <YAxis
          tickFormatter={formatter}
          stroke="var(--text-muted)"
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--border-subtle)' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="3 3" />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
          {sortedData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.pnl >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}



