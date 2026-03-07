export interface AdminStats {
  active_cohorts: number;
  total_agents: number;
  markets_tracked: number;
  total_api_cost: number;
}

export interface ResultMessage {
  type: 'success' | 'error';
  message: string;
  link?: string;
}

export interface ExportState {
  cohortId: string;
  from: string;
  to: string;
  includePrompts: boolean;
}
