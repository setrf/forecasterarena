export function parseUTCTimestamp(dateStr: string): Date {
  if (dateStr.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }

  const isoStr = dateStr.replace(' ', 'T') + 'Z';
  return new Date(isoStr);
}
