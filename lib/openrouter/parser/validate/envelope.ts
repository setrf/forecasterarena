import { mkError } from '@/lib/openrouter/parser/shared';
import type { Envelope, ParsedDecision, SupportedAction } from '@/lib/openrouter/parser/types';

export function validateEnvelope(parsed: any): Envelope | ParsedDecision {
  if (!parsed.action) {
    return mkError('Missing action field');
  }

  if (!parsed.reasoning || typeof parsed.reasoning !== 'string') {
    return mkError('Missing or invalid reasoning field');
  }

  const action = parsed.action.toUpperCase();
  if (!['BET', 'SELL', 'HOLD'].includes(action)) {
    return mkError(`Invalid action: ${parsed.action}`, parsed.reasoning);
  }

  return {
    action: action as SupportedAction,
    reasoning: parsed.reasoning
  };
}
