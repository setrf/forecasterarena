import { getPositionsByMarket } from '@/lib/db/queries';
import { recordBrierScoresForMarket } from '@/lib/engine/resolution/brier';
import { settlePositionForMarket } from '@/lib/engine/resolution/settlePositionForMarket';
import type { Market } from '@/lib/types';

export function processResolvedMarket(
  market: Market,
  winningOutcome: string
): { positions_settled: number; errors: string[] } {
  const positions = getPositionsByMarket(market.id);
  const errors: string[] = [];

  if (positions.length === 0) {
    console.log(`No positions to settle for market ${market.id}`);
    return { positions_settled: 0, errors };
  }

  console.log(`Settling ${positions.length} position(s) for market "${market.question.slice(0, 50)}..."`);

  let positionsSettled = 0;
  for (const position of positions) {
    try {
      settlePositionForMarket(position, market, winningOutcome);
      positionsSettled++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error settling position ${position.id}:`, error);
      errors.push(`Position ${position.id}: ${message}`);
    }
  }

  recordBrierScoresForMarket(market, winningOutcome);
  return { positions_settled: positionsSettled, errors };
}
