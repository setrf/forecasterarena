import type { Decision } from '@/lib/types';

export interface DecisionClaimResult {
  status: 'claimed' | 'skipped';
  decision: Decision;
  retryReason?: string;
}

export interface CreateDecisionInput {
  agent_id: string;
  cohort_id: string;
  decision_week: number;
  prompt_system: string;
  prompt_user: string;
  raw_response?: string;
  parsed_response?: string;
  retry_count?: number;
  action: 'BET' | 'SELL' | 'HOLD' | 'ERROR';
  reasoning?: string;
  tokens_input?: number;
  tokens_output?: number;
  api_cost_usd?: number;
  response_time_ms?: number;
  error_message?: string;
}

export interface FinalizeDecisionInput {
  prompt_system: string;
  prompt_user: string;
  raw_response?: string;
  parsed_response?: string;
  retry_count?: number;
  action: 'BET' | 'SELL' | 'HOLD' | 'ERROR';
  reasoning?: string;
  tokens_input?: number;
  tokens_output?: number;
  api_cost_usd?: number;
  response_time_ms?: number;
  error_message?: string | null;
}

export type DecisionErrorDetails = Partial<{
  prompt_system: string;
  prompt_user: string;
  raw_response: string;
  parsed_response: string;
  retry_count: number;
  reasoning: string;
  tokens_input: number;
  tokens_output: number;
  api_cost_usd: number;
  response_time_ms: number;
}>;

export interface ClaimDecisionArgs {
  agent_id: string;
  cohort_id: string;
  decision_week: number;
  stale_after_ms: number;
}
