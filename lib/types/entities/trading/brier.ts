export interface BrierScoreRecord {
  id: string;
  agent_id: string;
  trade_id: string;
  market_id: string;
  family_id: string | null;
  release_id: string | null;
  benchmark_config_model_id: string | null;
  forecast_probability: number;
  actual_outcome: number;
  brier_score: number;
  calculated_at: string;
}
