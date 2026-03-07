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
import { EmptyBarChartState } from '@/components/charts/bar/EmptyBarChartState';
import { TooltipCard, TooltipRow } from '@/components/charts/bar/TooltipCard';
import {
  formatChartDecimal,
  interpretBrierScore,
  sortBrierChartData,
  type BrierChartDatum
} from '@/components/charts/bar/utils';

type BrierData = BrierChartDatum;

interface BrierBarChartProps {
  data: BrierData[];
  height?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: BrierData }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const interpretation = interpretBrierScore(data.brier_score);

  return (
    <TooltipCard color={data.color} title={data.model_name}>
      <TooltipRow
        label="Brier Score:"
        value={<span className="font-mono">{formatChartDecimal(data.brier_score)}</span>}
      />
      <TooltipRow
        label="Rating:"
        value={<span style={{ color: interpretation.color }}>{interpretation.label}</span>}
      />
      <TooltipRow label="Resolved Bets:" value={<span>{data.num_bets}</span>} />
    </TooltipCard>
  );
}

export default function BrierBarChart({
  data,
  height = 300,
}: BrierBarChartProps) {
  const sortedData = sortBrierChartData(data);

  if (!data.length) {
    return <EmptyBarChartState height={height} message="No Brier score data available" />;
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
          tickFormatter={(v) => formatChartDecimal(v, 2)}
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

