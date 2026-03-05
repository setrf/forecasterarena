import { generateId, getDb } from '../index';
import type { Decision } from '../../types';

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
