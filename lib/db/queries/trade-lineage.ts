import { getDb } from '@/lib/db/connection';

export interface TradeLineageSnapshot {
  family_id: string;
  release_id: string;
  benchmark_config_model_id: string;
}

export function getTradeLineageSnapshot(args: {
  agentId: string;
  decisionId?: string | null;
}): TradeLineageSnapshot {
  const db = getDb();

  if (args.decisionId) {
    const decisionRow = db.prepare(`
      SELECT family_id, release_id, benchmark_config_model_id
      FROM decisions
      WHERE id = ?
      LIMIT 1
    `).get(args.decisionId) as TradeLineageSnapshot | undefined;

    if (decisionRow?.family_id && decisionRow.release_id && decisionRow.benchmark_config_model_id) {
      return decisionRow;
    }
  }

  const agentRow = db.prepare(`
    SELECT family_id, release_id, benchmark_config_model_id
    FROM agents
    WHERE id = ?
    LIMIT 1
  `).get(args.agentId) as TradeLineageSnapshot | undefined;

  if (!agentRow?.family_id || !agentRow.release_id || !agentRow.benchmark_config_model_id) {
    throw new Error(`Agent ${args.agentId} is missing frozen trade lineage`);
  }

  return agentRow;
}
