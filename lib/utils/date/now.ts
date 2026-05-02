import { formatDate } from '@/lib/utils/date/format';

export function now(): string {
  return new Date().toISOString();
}

export function today(): string {
  return formatDate(new Date());
}

export function nowTimestamp(): string {
  const current = new Date();
  current.setUTCMinutes(Math.floor(current.getUTCMinutes() / 10) * 10, 0, 0);
  const year = current.getUTCFullYear();
  const month = String(current.getUTCMonth() + 1).padStart(2, '0');
  const day = String(current.getUTCDate()).padStart(2, '0');
  const hours = String(current.getUTCHours()).padStart(2, '0');
  const minutes = String(current.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:00`;
}
