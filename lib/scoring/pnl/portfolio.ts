import { INITIAL_BALANCE } from '@/lib/constants';

export function calculateTotalValue(
  cashBalance: number,
  positionsValue: number
): number {
  return cashBalance + positionsValue;
}

export function calculateTotalPnL(
  totalValue: number,
  initialBalance: number = INITIAL_BALANCE
): number {
  return totalValue - initialBalance;
}

export function calculatePnLPercent(
  totalPnL: number,
  initialBalance: number = INITIAL_BALANCE
): number {
  if (initialBalance === 0) {
    return 0;
  }

  return (totalPnL / initialBalance) * 100;
}

export function calculateROI(
  totalValue: number,
  initialBalance: number = INITIAL_BALANCE
): number {
  if (initialBalance === 0) {
    return 0;
  }

  return (totalValue - initialBalance) / initialBalance;
}
