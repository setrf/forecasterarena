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
