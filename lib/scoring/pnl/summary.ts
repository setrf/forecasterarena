import {
  calculatePnLPercent,
  calculateTotalPnL
} from '@/lib/scoring/pnl/portfolio';
import type {
  PortfolioSummary,
  PortfolioSummaryPosition
} from '@/lib/scoring/pnl/types';

export function calculatePortfolioSummary(
  cashBalance: number,
  positions: PortfolioSummaryPosition[]
): PortfolioSummary {
  const positionsValue = positions.reduce((sum, position) => sum + (position.current_value || 0), 0);
  const totalCost = positions.reduce((sum, position) => sum + (position.total_cost || 0), 0);
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
