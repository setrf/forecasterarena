import { formatDisplayDate } from '@/lib/utils/date/format';
import { parseUTCTimestamp } from '@/lib/utils/date/parse';

export function formatRelativeTime(dateStr: string, nowDate: Date = new Date()): string {
  const date = parseUTCTimestamp(dateStr);
  const diff = nowDate.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return formatDisplayDate(dateStr, { month: 'short', day: 'numeric' });
}
