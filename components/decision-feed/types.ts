export interface DecisionFeedDecision {
  id: string;
  agent_id: string;
  cohort_id: string;
  decision_week: number;
  decision_timestamp: string;
  action: string;
  reasoning: string | null;
  model_display_name: string;
  model_color: string;
  cohort_number?: number;
}

export interface DecisionFeedProps {
  limit?: number;
  showCohort?: boolean;
  autoRefresh?: boolean;
  className?: string;
  decisions?: DecisionFeedDecision[];
}
