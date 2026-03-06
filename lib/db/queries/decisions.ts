import { generateId, getDb, withImmediateTransaction } from '../index';
import type { Decision } from '../../types';

const DECISION_IN_PROGRESS_ERROR = '__IN_PROGRESS__';
const DECISION_PLACEHOLDER_PROMPT = '__IN_PROGRESS__';

export interface DecisionClaimResult {
  status: 'claimed' | 'skipped';
  decision: Decision;
  retryReason?: string;
}

export function createDecision(decision: {
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
}): Decision {
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

  return db.prepare('SELECT * FROM decisions WHERE id = ?').get(id) as Decision;
}

export function getDecisionById(id: string): Decision | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM decisions WHERE id = ?').get(id) as Decision | undefined;
}

export function getDecisionByAgentWeek(
  agentId: string,
  cohortId: string,
  decisionWeek: number
): Decision | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM decisions
    WHERE agent_id = ?
      AND cohort_id = ?
      AND decision_week = ?
    ORDER BY decision_timestamp DESC
    LIMIT 1
  `).get(agentId, cohortId, decisionWeek) as Decision | undefined;
}

export function claimDecisionForProcessing(args: {
  agent_id: string;
  cohort_id: string;
  decision_week: number;
  stale_after_ms: number;
}): DecisionClaimResult {
  return withImmediateTransaction(() => {
    const db = getDb();
    const now = new Date().toISOString();
    const existing = getDecisionByAgentWeek(args.agent_id, args.cohort_id, args.decision_week);

    if (existing) {
      const tradesCount = (db.prepare(`
        SELECT COUNT(*) as count
        FROM trades
        WHERE decision_id = ?
      `).get(existing.id) as { count: number }).count;
      const retryableNoTrades = (
        existing.action === 'BET' || existing.action === 'SELL'
      ) && tradesCount === 0;
      const inProgress = existing.action === 'ERROR' && existing.error_message === DECISION_IN_PROGRESS_ERROR;
      const isStale = inProgress &&
        (Date.now() - new Date(existing.decision_timestamp).getTime()) > args.stale_after_ms;

      if (!inProgress && existing.action !== 'ERROR' && !retryableNoTrades) {
        return { status: 'skipped', decision: existing };
      }

      if (inProgress && !isStale) {
        return { status: 'skipped', decision: existing };
      }

      db.prepare(`
        UPDATE decisions
        SET decision_timestamp = ?,
            prompt_system = ?,
            prompt_user = ?,
            raw_response = NULL,
            parsed_response = NULL,
            action = 'ERROR',
            reasoning = ?,
            tokens_input = NULL,
            tokens_output = NULL,
            api_cost_usd = NULL,
            response_time_ms = NULL,
            error_message = ?
        WHERE id = ?
      `).run(
        now,
        DECISION_PLACEHOLDER_PROMPT,
        DECISION_PLACEHOLDER_PROMPT,
        retryableNoTrades
          ? 'Retrying decision because no trades were recorded'
          : existing.reasoning,
        DECISION_IN_PROGRESS_ERROR,
        existing.id
      );

      return {
        status: 'claimed',
        decision: getDecisionById(existing.id)!,
        retryReason: retryableNoTrades
          ? 'Retrying decision because no trades were recorded'
          : (inProgress ? 'Retrying stale in-progress decision' : undefined)
      };
    }

    const id = generateId();
    db.prepare(`
      INSERT INTO decisions (
        id, agent_id, cohort_id, decision_week, decision_timestamp,
        prompt_system, prompt_user, raw_response, parsed_response, retry_count,
        action, reasoning, tokens_input, tokens_output, api_cost_usd,
        response_time_ms, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0, 'ERROR', NULL, NULL, NULL, NULL, NULL, ?)
    `).run(
      id,
      args.agent_id,
      args.cohort_id,
      args.decision_week,
      now,
      DECISION_PLACEHOLDER_PROMPT,
      DECISION_PLACEHOLDER_PROMPT,
      DECISION_IN_PROGRESS_ERROR
    );

    return {
      status: 'claimed',
      decision: getDecisionById(id)!
    };
  });
}

export function finalizeDecision(
  decisionId: string,
  decision: {
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
  details?: Partial<{
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
  }>
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

export function getDecisionsByAgent(agentId: string, limit?: number): Decision[] {
  const db = getDb();

  if (limit) {
    return db.prepare(`
      SELECT * FROM decisions
      WHERE agent_id = ?
      ORDER BY decision_timestamp DESC
      LIMIT ?
    `).all(agentId, limit) as Decision[];
  }

  return db.prepare(`
    SELECT * FROM decisions
    WHERE agent_id = ?
    ORDER BY decision_timestamp DESC
  `).all(agentId) as Decision[];
}

export function getRecentDecisions(limit: number = 20): Decision[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM decisions
    ORDER BY decision_timestamp DESC
    LIMIT ?
  `).all(limit) as Decision[];
}

export function getTotalDecisionsForCohort(cohortId: string): number {
  const db = getDb();
  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM decisions
    WHERE cohort_id = ?
  `).get(cohortId) as { count: number };
  return result.count;
}
