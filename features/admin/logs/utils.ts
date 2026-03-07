export function getSeverityStyle(
  severity: string
): { bg: string; text: string; dot: string } {
  switch (severity) {
    case 'error':
      return {
        bg: 'bg-[var(--accent-rose)]/10',
        text: 'text-[var(--accent-rose)]',
        dot: 'bg-[var(--accent-rose)]'
      };
    case 'warning':
      return {
        bg: 'bg-[var(--accent-amber)]/10',
        text: 'text-[var(--accent-amber)]',
        dot: 'bg-[var(--accent-amber)]'
      };
    default:
      return {
        bg: 'bg-[var(--accent-emerald)]/10',
        text: 'text-[var(--accent-emerald)]',
        dot: 'bg-[var(--accent-emerald)]'
      };
  }
}

export function formatEventData(data: string | null): object | null {
  if (!data) return null;

  try {
    return JSON.parse(data) as object;
  } catch {
    return { raw: data };
  }
}
