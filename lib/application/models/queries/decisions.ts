import type { Db } from '@/lib/application/models/queries/types';

export function getRecentModelDecisions(
  db: Db,
  familyId: string
): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT
      d.*,
      c.cohort_number,
      abi.release_id as model_release_id,
      abi.release_display_name as model_release_name
    FROM decisions d
    JOIN agents a ON d.agent_id = a.id
    JOIN cohorts c ON d.cohort_id = c.id
    LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
    WHERE a.family_id = ?
    ORDER BY d.decision_timestamp DESC
    LIMIT 20
  `).all(familyId) as Array<Record<string, unknown>>;
}
