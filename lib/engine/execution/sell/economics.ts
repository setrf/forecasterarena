import type { Position } from '@/lib/types';

export function calculateSellEconomics(
  position: Position,
  sharesToSell: number,
  currentPrice: number
) {
  const proceeds = sharesToSell * currentPrice;
  const costBasisSold = (sharesToSell / position.shares) * position.total_cost;
  return {
    proceeds,
    costBasisSold,
    realizedPnL: proceeds - costBasisSold
  };
}
