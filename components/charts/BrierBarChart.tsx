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

interface BrierData {
  model_id: string;
  model_name: string;
  color: string;
  brier_score: number;
  num_bets: number;
}

interface BrierBarChartProps {
  data: BrierData[];
  height?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: BrierData }>;
}

function interpretBrier(score: number): { label: string; color: string } {
  if (score < 0.1) return { label: 'Excellent', color: 'var(--accent-emerald)' };
  if (score < 0.2) return { label: 'Good', color: 'var(--accent-blue)' };
  if (score < 0.25) return { label: 'Fair', color: 'var(--accent-amber)' };
  return { label: 'Poor', color: 'var(--accent-rose)' };
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const interpretation = interpretBrier(data.brier_score);

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
          <span className="text-[var(--text-muted)]">Brier Score:</span>
          <span className="font-mono">{data.brier_score.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-muted)]">Rating:</span>
          <span style={{ color: interpretation.color }}>{interpretation.label}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-muted)]">Resolved Bets:</span>
          <span>{data.num_bets}</span>
        </div>
      </div>
    </div>
  );
}

export default function BrierBarChart({
  data,
  height = 300,
}: BrierBarChartProps) {
  // Sort by Brier score ascending (lower is better)
  const sortedData = [...data].sort((a, b) => a.brier_score - b.brier_score);

  if (!data.length) {
    return (
      <div 
        className="flex items-center justify-center text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-lg"
        style={{ height }}
      >
        <p>No Brier score data available</p>
      </div>
    );
  }

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
          domain={[0, 0.5]}
          tickFormatter={(v) => v.toFixed(2)}
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
        {/* Reference line at 0.25 (random baseline) */}
        <ReferenceLine 
          x={0.25} 
          stroke="var(--accent-amber)" 
          strokeDasharray="5 5"
          label={{ 
            value: 'Random', 
            position: 'top',
            fill: 'var(--text-muted)',
            fontSize: 11
          }}
        />
        <Bar dataKey="brier_score" radius={[0, 4, 4, 0]}>
          {sortedData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

