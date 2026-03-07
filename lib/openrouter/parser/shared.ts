import type { ParsedDecision } from '@/lib/openrouter/parser/types';

export function mkError(error: string, reasoning: string = ''): ParsedDecision {
  return {
    action: 'ERROR',
    reasoning,
    error
  };
}

export function isErrorDecision(value: unknown): value is ParsedDecision {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'action' in value &&
      (value as ParsedDecision).action === 'ERROR'
  );
}
