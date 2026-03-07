export function getNextSundayLabel(): string {
  const now = new Date();
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  const nextSunday = new Date(now);
  nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(0, 0, 0, 0);

  return nextSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
