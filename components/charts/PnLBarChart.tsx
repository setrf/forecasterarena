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
  formatChartCurrency,
  formatChartPercent,
  sortPnLChartData,
  type PnLChartDatum
} from '@/components/charts/bar/utils';

type PnLData = PnLChartDatum;

interface PnLBarChartProps {
  data: PnLData[];
  height?: number;
  showPercent?: boolean;
  horizontal?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PnLData }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <TooltipCard color={data.color} title={data.model_name}>
      <TooltipRow
        label="P/L:"
        value={(
          <span className={`font-mono ${data.pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatChartCurrency(data.pnl)}
          </span>
        )}
      />
      <TooltipRow
        label="Return:"
        value={(
          <span className={`font-mono ${data.pnl_percent >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatChartPercent(data.pnl_percent)}
          </span>
        )}
      />
    </TooltipCard>
  );
}

export default function PnLBarChart({
  data,
  height = 300,
  showPercent = false,
  horizontal = true,
}: PnLBarChartProps) {
  const sortedData = sortPnLChartData(data);

  if (!data.length) {
    return <EmptyBarChartState height={height} message="No P/L data available" />;
  }

  const dataKey = showPercent ? 'pnl_percent' : 'pnl';
  const formatter = showPercent ? formatChartPercent : formatChartCurrency;

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
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          angle={-45}
          textAnchor="end"
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

