export interface AgentDecisionResult {
  agent_id: string;
  model_id: string;
  decision_id: string;
  action: string;
  success: boolean;
  error?: string;
  trades_executed?: number;
}

export interface CohortDecisionResult {
  cohort_id: string;
  cohort_number: number;
  week_number: number;
  agents_processed: number;
  decisions: AgentDecisionResult[];
  errors: string[];
}
