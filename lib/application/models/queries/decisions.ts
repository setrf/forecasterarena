import type { Db } from '@/lib/application/models/queries/types';

export function getRecentModelDecisions(
  db: Db,
  familyId: string
): Array<Record<string, unknown>> {
  return db.prepare(`
    SELECT
      d.id,
      d.cohort_id,
      d.decision_week,
      d.decision_timestamp,
      d.action,
      d.reasoning,
      c.cohort_number,
      dbi.release_id as model_release_id,
      dbi.release_display_name as model_release_name
    FROM decisions d
    JOIN agents a ON d.agent_id = a.id
    JOIN cohorts c ON d.cohort_id = c.id
    LEFT JOIN decision_benchmark_identity_v dbi ON dbi.decision_id = d.id
    WHERE COALESCE(dbi.family_id, a.family_id) = ?
      AND COALESCE(c.is_archived, 0) = 0
    ORDER BY d.decision_timestamp DESC
    LIMIT 20
  `).all(familyId) as Array<Record<string, unknown>>;
}
