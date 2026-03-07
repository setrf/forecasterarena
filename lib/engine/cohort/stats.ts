import { getDb } from '@/lib/db';
import {
  getAgentsByCohort,
  getCohortById,
  getCohortCompletionStatus
} from '@/lib/db/queries';
import type { CohortStats } from '@/lib/engine/cohort/types';

export function getCohortStats(cohortId: string): CohortStats | null {
  const cohort = getCohortById(cohortId);
  if (!cohort) {
    return null;
  }

  const db = getDb();
  const agents = getAgentsByCohort(cohortId);
  const completionStatus = getCohortCompletionStatus(cohortId);
  const tradeCount = (db.prepare(`
    SELECT COUNT(*) as count
    FROM trades t
    JOIN agents a ON t.agent_id = a.id
    WHERE a.cohort_id = ?
  `).get(cohortId) as { count: number }).count;

  return {
    cohort_id: cohort.id,
    cohort_number: cohort.cohort_number,
    num_agents: agents.length,
    active_agents: agents.filter(a => a.status === 'active').length,
    bankrupt_agents: agents.filter(a => a.status === 'bankrupt').length,
    open_positions: completionStatus.open_positions,
    total_trades: tradeCount
  };
}
