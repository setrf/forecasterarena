import { getDb } from '@/lib/db/connection';
import { generateId } from '@/lib/db/ids';
import {
  DECISION_PLACEHOLDER_PROMPT,
} from '@/lib/db/queries/decisions/constants';
import { getDecisionById } from '@/lib/db/queries/decisions/getters';
import type {
  CreateDecisionInput,
  DecisionErrorDetails,
  FinalizeDecisionInput
} from '@/lib/db/queries/decisions/types';
import type { Decision } from '@/lib/types';

export function createDecision(decision: CreateDecisionInput): Decision {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO decisions (
      id, agent_id, cohort_id, decision_week, decision_timestamp,
      prompt_system, prompt_user, raw_response, parsed_response, retry_count,
      action, reasoning, tokens_input, tokens_output, api_cost_usd,
      response_time_ms, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    decision.agent_id,
    decision.cohort_id,
    decision.decision_week,
    now,
    decision.prompt_system,
    decision.prompt_user,
    decision.raw_response,
    decision.parsed_response,
    decision.retry_count || 0,
    decision.action,
    decision.reasoning,
    decision.tokens_input,
    decision.tokens_output,
    decision.api_cost_usd,
    decision.response_time_ms,
    decision.error_message
  );

  return getDecisionById(id)!;
}

export function finalizeDecision(
  decisionId: string,
  decision: FinalizeDecisionInput
): Decision {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE decisions
    SET decision_timestamp = ?,
        prompt_system = ?,
        prompt_user = ?,
        raw_response = ?,
        parsed_response = ?,
        retry_count = ?,
        action = ?,
        reasoning = ?,
        tokens_input = ?,
        tokens_output = ?,
        api_cost_usd = ?,
        response_time_ms = ?,
        error_message = ?
    WHERE id = ?
  `).run(
    now,
    decision.prompt_system,
    decision.prompt_user,
    decision.raw_response,
    decision.parsed_response,
    decision.retry_count || 0,
    decision.action,
    decision.reasoning,
    decision.tokens_input,
    decision.tokens_output,
    decision.api_cost_usd,
    decision.response_time_ms,
    decision.error_message ?? null,
    decisionId
  );

  return getDecisionById(decisionId)!;
}

export function markDecisionAsError(
  decisionId: string,
  errorMessage: string,
  details?: DecisionErrorDetails
): Decision {
  return finalizeDecision(decisionId, {
    prompt_system: details?.prompt_system || DECISION_PLACEHOLDER_PROMPT,
    prompt_user: details?.prompt_user || DECISION_PLACEHOLDER_PROMPT,
    raw_response: details?.raw_response,
    parsed_response: details?.parsed_response,
    retry_count: details?.retry_count,
    action: 'ERROR',
    reasoning: details?.reasoning,
    tokens_input: details?.tokens_input,
    tokens_output: details?.tokens_output,
    api_cost_usd: details?.api_cost_usd,
    response_time_ms: details?.response_time_ms,
    error_message: errorMessage
  });
}
