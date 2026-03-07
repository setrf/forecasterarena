export interface Cohort {
  id: string;
  cohort_number: number;
  started_at: string;
  status: 'active' | 'completed';
  completed_at: string | null;
  methodology_version: string;
  initial_balance: number;
  created_at: string;
}

export interface Model {
  id: string;
  openrouter_id: string;
  display_name: string;
  provider: string;
  color: string | null;
  is_active: number;
  added_at: string;
}

export interface Agent {
  id: string;
  cohort_id: string;
  model_id: string;
  cash_balance: number;
  total_invested: number;
  status: 'active' | 'bankrupt';
  created_at: string;
}

export interface MethodologyVersion {
  version: string;
  title: string;
  description: string;
  changes_summary: string | null;
  effective_from_cohort: number | null;
  document_hash: string | null;
  created_at: string;
}
