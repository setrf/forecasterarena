export function calculatePositionValue(
  shares: number,
  side: 'YES' | 'NO' | string,
  currentYesPrice: number
): number {
  const normalizedSide = side.toUpperCase();

  if (normalizedSide === 'YES') {
    return shares * currentYesPrice;
  }

  if (normalizedSide === 'NO') {
    return shares * (1 - currentYesPrice);
  }

  return shares * currentYesPrice;
}

export function calculateSettlementValue(
  shares: number,
  side: 'YES' | 'NO' | string,
  winningOutcome: 'YES' | 'NO' | string
): number {
  const normalizedSide = side.toUpperCase();
  const normalizedOutcome = winningOutcome.toUpperCase();

  if (normalizedSide === normalizedOutcome) {
    return shares * 1.0;
  }

  return 0;
}

export function calculateRealizedPnL(
  settlementValue: number,
  costBasis: number
): number {
  return settlementValue - costBasis;
}

export function calculateUnrealizedPnL(
  currentValue: number,
  costBasis: number
): number {
  return currentValue - costBasis;
}
