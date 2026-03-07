export interface ApiCost {
  id: string;
  model_id: string;
  decision_id: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  recorded_at: string;
}
