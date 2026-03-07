export function parseUTCTimestamp(dateStr: string): Date {
  if (dateStr.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }

  const isoStr = dateStr.replace(' ', 'T') + 'Z';
  return new Date(isoStr);
}

export function formatDate(date: Date | string): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  return parsed.toISOString().split('T')[0];
}

export function formatDateTime(date: Date | string): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(parsed);
}

export function formatDisplayDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  }).format(parseUTCTimestamp(dateStr));
}

export function formatDisplayDateTime(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...options
  }).format(parseUTCTimestamp(dateStr));
}

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

export function getTimeUntilNextSunday(): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total_ms: number;
} {
  const now = new Date();
  const nextSunday = new Date(now);

  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(0, 0, 0, 0);

  const diff = nextSunday.getTime() - now.getTime();

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    total_ms: diff
  };
}

export function calculateWeekNumber(
  cohortStartDate: string | Date,
  currentDate: Date = new Date()
): number {
  const start = typeof cohortStartDate === 'string'
    ? new Date(cohortStartDate)
    : cohortStartDate;

  const startMidnight = new Date(start);
  startMidnight.setUTCHours(0, 0, 0, 0);

  const currentMidnight = new Date(currentDate);
  currentMidnight.setUTCHours(0, 0, 0, 0);

  const diffMs = currentMidnight.getTime() - startMidnight.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.floor(diffDays / 7) + 1;
}

export function isPast(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

export function isFuture(dateStr: string): boolean {
  return new Date(dateStr) > new Date();
}

export function now(): string {
  return new Date().toISOString();
}

export function today(): string {
  return formatDate(new Date());
}

export function nowTimestamp(): string {
  const current = new Date();
  const year = current.getUTCFullYear();
  const month = String(current.getUTCMonth() + 1).padStart(2, '0');
  const day = String(current.getUTCDate()).padStart(2, '0');
  const hours = String(current.getUTCHours()).padStart(2, '0');
  const minutes = String(current.getUTCMinutes()).padStart(2, '0');
  const seconds = String(current.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
