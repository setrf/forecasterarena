import type { AgentWithCohort } from '@/lib/application/models/types';
import type { Db } from '@/lib/application/models/queries/types';

export function getAgentsWithCohorts(
  db: Db,
  modelId: string
): AgentWithCohort[] {
  return db.prepare(`
    SELECT
      a.*,
      c.cohort_number,
      c.started_at as cohort_started_at,
      c.status as cohort_status
    FROM agents a
    JOIN cohorts c ON a.cohort_id = c.id
    WHERE a.model_id = ?
    ORDER BY c.started_at DESC
  `).all(modelId) as AgentWithCohort[];
}
