/**
 * Betting and bankroll configuration.
 */
export const INITIAL_BALANCE = 10000;
export const MIN_BET = 50;
export const MAX_BET_PERCENT = 0.25;
export const TOP_MARKETS_COUNT = 500;

export function calculateMaxBet(cashBalance: number): number {
  return cashBalance * MAX_BET_PERCENT;
}

export function validateBetAmount(amount: number, cashBalance: number): {
  valid: boolean;
  error?: string;
  adjustedAmount?: number;
} {
  if (amount < MIN_BET) {
    return { valid: false, error: `Minimum bet is $${MIN_BET}` };
  }

  const maxBet = calculateMaxBet(cashBalance);

  if (amount > maxBet) {
    return {
      valid: true,
      adjustedAmount: maxBet,
      error: `Amount capped to maximum of $${maxBet.toFixed(2)} (25% of balance)`
    };
  }

  if (amount > cashBalance) {
    return { valid: false, error: 'Insufficient balance' };
  }

  return { valid: true };
}
