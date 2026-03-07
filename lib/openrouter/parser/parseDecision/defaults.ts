import type { ParsedDecision } from '@/lib/openrouter/parser/types';

export function isValidDecision(decision: ParsedDecision): boolean {
  return decision.action !== 'ERROR';
}

export function getDefaultHoldDecision(reason: string): ParsedDecision {
  return {
    action: 'HOLD',
    reasoning: `[SYSTEM DEFAULT] ${reason}`
  };
}
