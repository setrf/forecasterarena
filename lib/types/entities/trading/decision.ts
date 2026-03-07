export interface Decision {
  id: string;
  agent_id: string;
  cohort_id: string;
  decision_week: number;
  decision_timestamp: string;
  prompt_system: string;
  prompt_user: string;
  raw_response: string | null;
  parsed_response: string | null;
  retry_count: number;
  action: 'BET' | 'SELL' | 'HOLD' | 'ERROR';
  reasoning: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  api_cost_usd: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}
