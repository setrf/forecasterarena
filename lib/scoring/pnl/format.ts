export function formatPnL(pnl: number, showSign: boolean = true): string {
  const sign = pnl >= 0 ? (showSign ? '+' : '') : '';
  return `${sign}$${pnl.toFixed(2)}`;
}

export function formatPercent(percent: number, showSign: boolean = true): string {
  const sign = percent >= 0 ? (showSign ? '+' : '') : '';
  return `${sign}${percent.toFixed(2)}%`;
}
