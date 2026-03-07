import type { Agent, Cohort } from '@/lib/types';

export interface StartCohortResult {
  success: boolean;
  cohort?: Cohort;
  agents?: Agent[];
  error?: string;
}

export interface CohortStats {
  cohort_id: string;
  cohort_number: number;
  num_agents: number;
  active_agents: number;
  bankrupt_agents: number;
  open_positions: number;
  total_trades: number;
}
