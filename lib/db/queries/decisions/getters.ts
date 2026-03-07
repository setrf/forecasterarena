import { getDb } from '@/lib/db/connection';
import type { Decision } from '@/lib/types';

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
