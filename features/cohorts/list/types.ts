export interface CohortSummary {
  id: string;
  cohort_number: number;
  started_at: string;
  status: string;
  decision_eligible: boolean;
  decision_status: 'decisioning' | 'tracking_only' | 'completed';
  num_agents: number;
  total_markets_traded: number;
  methodology_version: string;
}
