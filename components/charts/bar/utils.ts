import { formatDecimal, formatSignedPercent, formatSignedUsd } from '@/lib/format/display';

export interface ChartMetricData {
  model_id: string;
  model_name: string;
  color: string;
}

export interface PnLChartDatum extends ChartMetricData {
  pnl: number;
  pnl_percent: number;
}

export interface BrierChartDatum extends ChartMetricData {
  brier_score: number;
  num_bets: number;
}

export function formatChartCurrency(value: number): string {
  return formatSignedUsd(value);
}

export function formatChartPercent(value: number): string {
  return formatSignedPercent(value, { decimals: 1 });
}

export function formatChartDecimal(value: number, decimals: number = 2): string {
  return formatDecimal(value, { decimals });
}

export function sortPnLChartData(data: PnLChartDatum[]): PnLChartDatum[] {
  return [...data].sort((a, b) => b.pnl - a.pnl);
}

export function sortBrierChartData(data: BrierChartDatum[]): BrierChartDatum[] {
  return [...data].sort((a, b) => a.brier_score - b.brier_score);
}

export function interpretBrierScore(score: number): { label: string; color: string } {
  if (score < 0.1) return { label: 'Excellent', color: 'var(--accent-emerald)' };
  if (score < 0.2) return { label: 'Good', color: 'var(--accent-blue)' };
  if (score < 0.25) return { label: 'Fair', color: 'var(--accent-amber)' };
  return { label: 'Poor', color: 'var(--accent-rose)' };
}
