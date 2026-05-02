import { formatCurrency as baseFormatCurrency } from '../utils';

interface NumericFormatOptions {
  decimals?: number;
  nullDisplay?: string;
}

interface CurrencyFormatOptions extends NumericFormatOptions {
  absolute?: boolean;
}

export function formatUsd(
  value: number | null | undefined,
  options: CurrencyFormatOptions = {}
): string {
  const {
    decimals = 0,
    nullDisplay = 'N/A',
    absolute = false
  } = options;

  if (value === null || value === undefined) {
    return nullDisplay;
  }

  return baseFormatCurrency(absolute ? Math.abs(value) : value, decimals);
}

export function formatSignedUsd(
  value: number | null | undefined,
  options: NumericFormatOptions = {}
): string {
  const { decimals = 0, nullDisplay = 'N/A' } = options;

  if (value === null || value === undefined) {
    return nullDisplay;
  }

  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatUsd(value, { decimals, absolute: true })}`;
}

export function formatSignedPercent(
  value: number | null | undefined,
  options: NumericFormatOptions = {}
): string {
  const { decimals = 2, nullDisplay = 'N/A' } = options;

  if (value === null || value === undefined) {
    return nullDisplay;
  }

  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatRatePercent(
  value: number | null | undefined,
  options: NumericFormatOptions = {}
): string {
  const { decimals = 1, nullDisplay = 'N/A' } = options;

  if (value === null || value === undefined) {
    return nullDisplay;
  }

  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatProbabilityPercent(
  value: number | null | undefined,
  options: NumericFormatOptions = {}
): string {
  const { decimals = 1, nullDisplay = 'N/A' } = options;

  if (value === null || value === undefined) {
    return nullDisplay;
  }

  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDecimal(
  value: number | null | undefined,
  options: NumericFormatOptions = {}
): string {
  const { decimals = 4, nullDisplay = 'N/A' } = options;

  if (value === null || value === undefined) {
    return nullDisplay;
  }

  return value.toFixed(decimals);
}

export function percentDeltaFromBaseline(value: number, baseline: number): number {
  return ((value - baseline) / baseline) * 100;
}

export function formatPercentDeltaFromBaseline(
  value: number,
  baseline: number,
  decimals: number = 1
): string {
  return formatSignedPercent(percentDeltaFromBaseline(value, baseline), { decimals });
}
