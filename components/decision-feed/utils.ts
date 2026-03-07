export function getDecisionActionStyle(action: string): { bg: string; text: string } {
  switch (action) {
    case 'BET':
      return { bg: 'bg-[var(--accent-emerald)]/20', text: 'text-[var(--accent-emerald)]' };
    case 'SELL':
      return { bg: 'bg-[var(--accent-amber)]/20', text: 'text-[var(--accent-amber)]' };
    case 'HOLD':
      return { bg: 'bg-[var(--text-muted)]/20', text: 'text-[var(--text-muted)]' };
    case 'ERROR':
      return { bg: 'bg-[var(--accent-rose)]/20', text: 'text-[var(--accent-rose)]' };
    default:
      return { bg: 'bg-[var(--text-muted)]/20', text: 'text-[var(--text-muted)]' };
  }
}

export function hasDecisionReasoning(reasoning: string | null): boolean {
  return Boolean(reasoning && reasoning.trim().length > 0);
}
