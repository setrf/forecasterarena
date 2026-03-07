import { MAX_BET_PERCENT } from '@/lib/constants';

export function calculateImpliedConfidence(
  betAmount: number,
  cashBalanceAtBet: number
): number {
  const maxBet = cashBalanceAtBet * MAX_BET_PERCENT;

  if (maxBet <= 0) {
    return 0;
  }

  return Math.min(betAmount / maxBet, 1.0);
}
