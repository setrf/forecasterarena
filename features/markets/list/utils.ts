export function formatMarketVolume(volume: number | null): string {
  if (!volume) return 'N/A';
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(0)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
  return `$${volume.toFixed(0)}`;
}

export function formatMarketCloseDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return 'Closed';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.ceil(days / 7)}w`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
