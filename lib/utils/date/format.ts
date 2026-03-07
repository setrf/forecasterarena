import { parseUTCTimestamp } from '@/lib/utils/date/parse';

function toDate(date: Date | string): Date {
  return typeof date === 'string' ? new Date(date) : date;
}

export function formatDate(date: Date | string): string {
  return toDate(date).toISOString().split('T')[0];
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(toDate(date));
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
