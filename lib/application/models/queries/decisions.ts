import type { Db } from '@/lib/application/models/queries/types';

export function getRecentModelDecisions(
  db: Db,
  modelId: string
): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT d.*, c.cohort_number
    FROM decisions d
    JOIN agents a ON d.agent_id = a.id
    JOIN cohorts c ON d.cohort_id = c.id
    WHERE a.model_id = ?
    ORDER BY d.decision_timestamp DESC
    LIMIT 20
  `).all(modelId) as Array<Record<string, unknown>>;
}
