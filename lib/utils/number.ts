export function formatCurrency(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatPnL(value: number, decimals: number = 0): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatCurrency(value, decimals)}`;
}

export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) {
    return 0;
  }

  return (newValue - oldValue) / oldValue;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
