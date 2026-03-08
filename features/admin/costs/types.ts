export interface CostByModel {
  public_model_id: string;
  model_id: string;
  family_id: string | null;
  family_slug?: string | null;
  legacy_model_id?: string | null;
  model_name: string;
  color: string;
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  decision_count: number;
}

export interface CostSummary {
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_decisions: number;
  avg_cost_per_decision: number;
}
