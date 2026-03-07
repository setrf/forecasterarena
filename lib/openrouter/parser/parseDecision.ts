import { cleanResponse } from '@/lib/openrouter/parser/clean';
import { isErrorDecision } from '@/lib/openrouter/parser/shared';
import { parseActionItems, validateBet, validateEnvelope, validateSell } from '@/lib/openrouter/parser/validate';
import type { BetInstruction, ParsedDecision, SellInstruction } from '@/lib/openrouter/parser/types';

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
      const bets = parseActionItems<BetInstruction, BetInstruction>({
        rawItems: parsed.bets,
        emptyError: 'BET action requires non-empty bets array',
        invalidPrefix: 'bet',
        reasoning: envelope.reasoning,
        validate: (bet) => validateBet(bet, agentBalance),
        mapItem: (bet) => ({
          market_id: bet.market_id,
          side: bet.side,
          amount: bet.amount
        })
      });

      if (isErrorDecision(bets)) {
        return bets;
      }

      return {
        action: 'BET',
        bets,
        reasoning: envelope.reasoning
      };
    }

    if (envelope.action === 'SELL') {
      const sells = parseActionItems<SellInstruction, SellInstruction>({
        rawItems: parsed.sells,
        emptyError: 'SELL action requires non-empty sells array',
        invalidPrefix: 'sell',
        reasoning: envelope.reasoning,
        validate: validateSell,
        mapItem: (sell) => ({
          position_id: sell.position_id,
          percentage: sell.percentage
        })
      });

      if (isErrorDecision(sells)) {
        return sells;
      }

      return {
        action: 'SELL',
        sells,
        reasoning: envelope.reasoning
      };
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

export function isValidDecision(decision: ParsedDecision): boolean {
  return decision.action !== 'ERROR';
}

export function getDefaultHoldDecision(reason: string): ParsedDecision {
  return {
    action: 'HOLD',
    reasoning: `[SYSTEM DEFAULT] ${reason}`
  };
}
