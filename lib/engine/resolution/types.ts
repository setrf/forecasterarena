export interface ResolutionCheckResult {
  markets_checked: number;
  markets_resolved: number;
  positions_settled: number;
  errors: string[];
}

export interface MarketResolutionResult {
  resolved: boolean;
  positions_settled: number;
  errors: string[];
}
