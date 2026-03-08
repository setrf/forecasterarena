export interface ApiCost {
  id: string;
  model_id: string;
  agent_id: string | null;
  family_id: string | null;
  release_id: string | null;
  benchmark_config_model_id: string | null;
  decision_id: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  recorded_at: string;
}
