import { MIN_BET } from '@/lib/constants';
import { mkError } from '@/lib/openrouter/parser/shared';
import type {
  BetInstruction,
  Envelope,
  ParsedDecision,
  SellInstruction,
  SupportedAction
} from '@/lib/openrouter/parser/types';

export function validateBet(
  bet: BetInstruction,
  agentBalance: number,
  maxBetPercent: number = 0.25
): string | null {
  if (!bet.market_id) {
    return 'Missing market_id';
  }

  if (!bet.side) {
    return 'Missing side';
  }

  if (typeof bet.amount !== 'number' || Number.isNaN(bet.amount)) {
    return 'Invalid amount';
  }

  if (!bet.side.trim()) {
    return 'Side cannot be empty';
  }

  if (bet.amount < MIN_BET) {
    return `Bet amount $${bet.amount} is below minimum $${MIN_BET}`;
  }

  const maxBet = agentBalance * maxBetPercent;
  if (bet.amount > maxBet) {
    return `Bet amount $${bet.amount} exceeds maximum $${maxBet.toFixed(2)}`;
  }

  return null;
}

export function validateSell(sell: SellInstruction): string | null {
  if (!sell.position_id) {
    return 'Missing position_id';
  }

  if (typeof sell.percentage !== 'number' || Number.isNaN(sell.percentage)) {
    return 'Invalid percentage';
  }

  if (sell.percentage < 1 || sell.percentage > 100) {
    return `Percentage must be 1-100, got ${sell.percentage}`;
  }

  return null;
}

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

export function parseActionItems<TInput, TOutput>(args: {
  rawItems: unknown;
  emptyError: string;
  invalidPrefix: 'bet' | 'sell';
  reasoning: string;
  validate: (item: TInput) => string | null;
  mapItem: (item: TInput) => TOutput;
}): TOutput[] | ParsedDecision {
  if (!Array.isArray(args.rawItems) || args.rawItems.length === 0) {
    return mkError(args.emptyError, args.reasoning);
  }

  const parsedItems: TOutput[] = [];
  for (const rawItem of args.rawItems as TInput[]) {
    const error = args.validate(rawItem);
    if (error) {
      return mkError(`Invalid ${args.invalidPrefix}: ${error}`, args.reasoning);
    }

    parsedItems.push(args.mapItem(rawItem));
  }

  return parsedItems;
}
