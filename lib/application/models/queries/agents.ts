import type { AgentWithCohort } from '@/lib/application/models/types';
import type { Db } from '@/lib/application/models/queries/types';

export function getAgentsWithCohorts(
  db: Db,
  familyId: string
): AgentWithCohort[] {
  return db.prepare(`
    SELECT
      a.*,
      c.cohort_number,
      c.started_at as cohort_started_at,
      c.status as cohort_status,
      c.methodology_version,
      COALESCE(c.is_archived, 0) as is_archived,
      c.archived_at,
      c.archive_reason
    FROM agents a
    JOIN cohorts c ON a.cohort_id = c.id
    WHERE a.family_id = ?
    ORDER BY c.started_at DESC
  `).all(familyId) as AgentWithCohort[];
}
