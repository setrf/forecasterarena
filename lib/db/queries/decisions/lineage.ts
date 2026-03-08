import { getDb } from '@/lib/db/connection';

export interface DecisionLineageSnapshot {
  family_id: string;
  release_id: string;
  benchmark_config_model_id: string;
}

export function getDecisionLineageSnapshot(agentId: string): DecisionLineageSnapshot {
  const db = getDb();
  const row = db.prepare(`
    SELECT family_id, release_id, benchmark_config_model_id
    FROM agents
    WHERE id = ?
    LIMIT 1
  `).get(agentId) as DecisionLineageSnapshot | undefined;

  if (!row?.family_id || !row.release_id || !row.benchmark_config_model_id) {
    throw new Error(`Agent ${agentId} is missing frozen benchmark lineage`);
  }

  return row;
}
