export interface CohortSummary {
  id: string;
  cohort_number: number;
  started_at: string;
  status: string;
  decision_eligible: boolean;
  decision_status: 'decisioning' | 'tracking_only' | 'completed';
  is_archived: boolean;
  archived_at: string | null;
  archive_reason: string | null;
  scoring_status: 'current' | 'archived';
  num_agents: number;
  total_markets_traded: number;
  methodology_version: string;
}
