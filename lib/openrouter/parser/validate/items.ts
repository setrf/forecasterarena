import { mkError } from '@/lib/openrouter/parser/shared';
import type { ParsedDecision } from '@/lib/openrouter/parser/types';

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
