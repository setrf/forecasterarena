import { isErrorDecision, mkError } from '@/lib/openrouter/parser/shared';
import { parseActionItems, validateBet, validateBetBatch, validateSell } from '@/lib/openrouter/parser/validate';
import type { BetInstruction, ParsedDecision, SellInstruction } from '@/lib/openrouter/parser/types';

export function parseBetDecision(parsed: { bets?: unknown; reasoning: string }, agentBalance: number): ParsedDecision {
  const bets = parseActionItems<BetInstruction, BetInstruction>({
    rawItems: parsed.bets,
    emptyError: 'BET action requires non-empty bets array',
    invalidPrefix: 'bet',
    reasoning: parsed.reasoning,
    validate: (bet) => validateBet(bet, agentBalance),
    mapItem: (bet) => ({
      market_id: bet.market_id.trim(),
      side: bet.side.trim().toUpperCase() === 'YES' || bet.side.trim().toUpperCase() === 'NO'
        ? bet.side.trim().toUpperCase()
        : bet.side.trim(),
      amount: bet.amount
    })
  });

  if (isErrorDecision(bets)) {
    return bets;
  }

  const batchError = validateBetBatch(bets, agentBalance);
  if (batchError) {
    return mkError(`Invalid bet batch: ${batchError}`, parsed.reasoning);
  }

  return {
    action: 'BET',
    bets,
    reasoning: parsed.reasoning
  };
}

export function parseSellDecision(parsed: { sells?: unknown; reasoning: string }): ParsedDecision {
  const sells = parseActionItems<SellInstruction, SellInstruction>({
    rawItems: parsed.sells,
    emptyError: 'SELL action requires non-empty sells array',
    invalidPrefix: 'sell',
    reasoning: parsed.reasoning,
    validate: validateSell,
    mapItem: (sell) => ({
      position_id: sell.position_id.trim(),
      percentage: sell.percentage
    })
  });

  if (isErrorDecision(sells)) {
    return sells;
  }

  return {
    action: 'SELL',
    sells,
    reasoning: parsed.reasoning
  };
}
