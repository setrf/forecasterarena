export interface PortfolioSummaryPosition {
  current_value: number;
  total_cost: number;
}

export interface PortfolioSummary {
  cash_balance: number;
  positions_value: number;
  total_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  unrealized_pnl: number;
}
