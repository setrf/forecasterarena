/**
 * Profit/Loss Calculation
 * 
 * Functions for calculating portfolio values and P/L.
 * Handles both realized (settled) and unrealized (mark-to-market) P/L.
 * 
 * @module scoring/pnl
 */

import { INITIAL_BALANCE } from '../constants';

/**
 * Calculate the current value of a position
 * 
 * For YES positions: shares × currentYesPrice
 * For NO positions: shares × (1 - currentYesPrice)
 * 
 * @param shares - Number of shares held
 * @param side - 'YES' or 'NO'
 * @param currentYesPrice - Current YES price (0 to 1)
 * @returns Position value in dollars
 */
export function calculatePositionValue(
  shares: number,
  side: 'YES' | 'NO' | string,
  currentYesPrice: number
): number {
  const normalizedSide = side.toUpperCase();
  
  if (normalizedSide === 'YES') {
    return shares * currentYesPrice;
  } else if (normalizedSide === 'NO') {
    return shares * (1 - currentYesPrice);
  } else {
    // Multi-outcome: need the specific outcome price
    return shares * currentYesPrice;
  }
}

/**
 * Calculate the settlement value when a market resolves
 * 
 * Winning positions: shares × $1 = shares
 * Losing positions: shares × $0 = 0
 * 
 * @param shares - Number of shares held
 * @param side - Side that was bet on
 * @param winningOutcome - The winning outcome
 * @returns Settlement value in dollars
 */
export function calculateSettlementValue(
  shares: number,
  side: 'YES' | 'NO' | string,
  winningOutcome: 'YES' | 'NO' | string
): number {
  const normalizedSide = side.toUpperCase();
  const normalizedOutcome = winningOutcome.toUpperCase();
  
  // Position wins if side matches outcome
  if (normalizedSide === normalizedOutcome) {
    return shares * 1.0;
  }
  
  return 0;
}

/**
 * Calculate P/L for a settled position
 * 
 * @param settlementValue - Value received at settlement
 * @param costBasis - Original cost to enter position
 * @returns Realized P/L
 */
export function calculateRealizedPnL(
  settlementValue: number,
  costBasis: number
): number {
  return settlementValue - costBasis;
}

/**
 * Calculate unrealized P/L for an open position
 * 
 * @param currentValue - Current mark-to-market value
 * @param costBasis - Original cost to enter position
 * @returns Unrealized P/L
 */
export function calculateUnrealizedPnL(
  currentValue: number,
  costBasis: number
): number {
  return currentValue - costBasis;
}

/**
 * Calculate total portfolio value
 * 
 * @param cashBalance - Current cash balance
 * @param positionsValue - Sum of all position values
 * @returns Total portfolio value
 */
export function calculateTotalValue(
  cashBalance: number,
  positionsValue: number
): number {
  return cashBalance + positionsValue;
}

/**
 * Calculate portfolio P/L
 * 
 * @param totalValue - Current total portfolio value
 * @param initialBalance - Starting balance (default: $10,000)
 * @returns Total P/L
 */
export function calculateTotalPnL(
  totalValue: number,
  initialBalance: number = INITIAL_BALANCE
): number {
  return totalValue - initialBalance;
}

/**
 * Calculate portfolio P/L percentage
 * 
 * @param totalPnL - Total P/L in dollars
 * @param initialBalance - Starting balance (default: $10,000)
 * @returns P/L as percentage (e.g., 10.5 for 10.5%)
 */
export function calculatePnLPercent(
  totalPnL: number,
  initialBalance: number = INITIAL_BALANCE
): number {
  if (initialBalance === 0) return 0;
  return (totalPnL / initialBalance) * 100;
}

/**
 * Calculate return on investment
 * 
 * @param totalValue - Current portfolio value
 * @param initialBalance - Starting balance
 * @returns ROI as decimal (e.g., 0.105 for 10.5%)
 */
export function calculateROI(
  totalValue: number,
  initialBalance: number = INITIAL_BALANCE
): number {
  if (initialBalance === 0) return 0;
  return (totalValue - initialBalance) / initialBalance;
}

/**
 * Format P/L for display
 * 
 * @param pnl - P/L value
 * @param showSign - Whether to show + for positive values
 * @returns Formatted string (e.g., "+$150.00" or "-$50.00")
 */
export function formatPnL(pnl: number, showSign: boolean = true): string {
  const sign = pnl >= 0 ? (showSign ? '+' : '') : '';
  return `${sign}$${pnl.toFixed(2)}`;
}

/**
 * Format percentage for display
 * 
 * @param percent - Percentage value
 * @param showSign - Whether to show + for positive values
 * @returns Formatted string (e.g., "+10.50%" or "-5.25%")
 */
export function formatPercent(percent: number, showSign: boolean = true): string {
  const sign = percent >= 0 ? (showSign ? '+' : '') : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * Portfolio summary calculation
 * 
 * @param cashBalance - Current cash
 * @param positions - Array of positions with their current values
 * @returns Complete portfolio summary
 */
export function calculatePortfolioSummary(
  cashBalance: number,
  positions: Array<{
    current_value: number;
    total_cost: number;
  }>
): {
  cash_balance: number;
  positions_value: number;
  total_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  unrealized_pnl: number;
} {
  const positionsValue = positions.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalCost = positions.reduce((sum, p) => sum + (p.total_cost || 0), 0);
  const totalValue = cashBalance + positionsValue;
  const totalPnL = calculateTotalPnL(totalValue);
  const unrealizedPnL = positionsValue - totalCost;
  
  return {
    cash_balance: cashBalance,
    positions_value: positionsValue,
    total_value: totalValue,
    total_pnl: totalPnL,
    total_pnl_percent: calculatePnLPercent(totalPnL),
    unrealized_pnl: unrealizedPnL
  };
}


