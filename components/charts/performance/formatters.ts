import { formatDisplayDateTime, parseUTCTimestamp } from '@/lib/utils';
import { formatPercentDeltaFromBaseline, formatSignedUsd, formatUsd } from '@/lib/format/display';
import { BASELINE } from '@/components/charts/performance/constants';

export function formatPerformanceCurrency(value: number): string {
  return formatUsd(value);
}

export function formatPerformancePercent(value: number): string {
  return formatPercentDeltaFromBaseline(value, BASELINE, 1);
}

export function formatPerformancePercentAxis(value: number): string {
  return formatPercentDeltaFromBaseline(value, BASELINE, 0);
}

export function formatPerformanceDateTime(dateStr: string): string {
  return formatDisplayDateTime(dateStr, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function formatPerformanceDateShort(dateStr: string): string {
  const date = parseUTCTimestamp(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

export function formatPerformanceSignedUsd(value: number): string {
  return formatSignedUsd(value);
}
