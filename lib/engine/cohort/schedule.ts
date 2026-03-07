export function shouldStartNewCohort(): boolean {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const hour = now.getUTCHours();

  return dayOfWeek === 0 && hour < 1;
}
