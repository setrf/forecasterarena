export interface BrierScoreRecord {
  id: string;
  agent_id: string;
  trade_id: string;
  market_id: string;
  forecast_probability: number;
  actual_outcome: number;
  brier_score: number;
  calculated_at: string;
}
