import { cleanResponse } from '@/lib/openrouter/parser/clean';
import { getDefaultHoldDecision, isValidDecision } from '@/lib/openrouter/parser/parseDecision/defaults';
import { parseBetDecision, parseSellDecision } from '@/lib/openrouter/parser/parseDecision/actions';
import { isErrorDecision } from '@/lib/openrouter/parser/shared';
import { validateEnvelope } from '@/lib/openrouter/parser/validate';
import type { ParsedDecision } from '@/lib/openrouter/parser/types';

export function parseDecision(
  rawResponse: string,
  agentBalance: number = Number.POSITIVE_INFINITY
): ParsedDecision {
  try {
    const cleaned = cleanResponse(rawResponse);
    const parsed = JSON.parse(cleaned);
    const envelope = validateEnvelope(parsed);

    if (isErrorDecision(envelope)) {
      return envelope;
    }

    if (envelope.action === 'BET') {
      return parseBetDecision(
        {
          bets: parsed.bets,
          reasoning: envelope.reasoning
        },
        agentBalance
      );
    }

    if (envelope.action === 'SELL') {
      return parseSellDecision({
        sells: parsed.sells,
        reasoning: envelope.reasoning
      });
    }

    return {
      action: 'HOLD',
      reasoning: envelope.reasoning
    };
  } catch (error) {
    return {
      action: 'ERROR',
      reasoning: '',
      error: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export { getDefaultHoldDecision, isValidDecision };
