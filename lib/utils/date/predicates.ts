export function isPast(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

export function isFuture(dateStr: string): boolean {
  return new Date(dateStr) > new Date();
}
