import { generateId, getDb } from '../index';
import type { ApiCost } from '../../types';

export function createApiCost(cost: {
  model_id: string;
  agent_id?: string | null;
  family_id?: string | null;
  release_id?: string | null;
  benchmark_config_model_id?: string | null;
  decision_id?: string;
  tokens_input?: number;
  tokens_output?: number;
  cost_usd?: number;
}): ApiCost {
  const db = getDb();
  const existing = cost.decision_id
    ? db.prepare('SELECT id FROM api_costs WHERE decision_id = ?').get(cost.decision_id) as { id: string } | undefined
    : undefined;
  const id = existing?.id ?? generateId();
  const decisionLinkedLineage = cost.decision_id
    ? db.prepare(`
        SELECT
          d.agent_id,
          a.family_id,
          a.release_id,
          a.benchmark_config_model_id
        FROM decisions d
        JOIN agents a ON a.id = d.agent_id
        WHERE d.id = ?
        LIMIT 1
      `).get(cost.decision_id) as {
        agent_id: string | null;
        family_id: string | null;
        release_id: string | null;
        benchmark_config_model_id: string | null;
      } | undefined
    : undefined;
  const agentLinkedLineage = !cost.decision_id && cost.agent_id
    ? db.prepare(`
        SELECT
          id as agent_id,
          family_id,
          release_id,
          benchmark_config_model_id
        FROM agents
        WHERE id = ?
        LIMIT 1
      `).get(cost.agent_id) as {
        agent_id: string | null;
        family_id: string | null;
        release_id: string | null;
        benchmark_config_model_id: string | null;
      } | undefined
    : undefined;
  const inferredLineage = decisionLinkedLineage ?? agentLinkedLineage;
  const resolvedAgentId =
    cost.agent_id ??
    (cost.decision_id ? inferredLineage?.agent_id : null);
  const resolvedFamilyId = cost.family_id ?? inferredLineage?.family_id ?? null;
  const resolvedReleaseId = cost.release_id ?? inferredLineage?.release_id ?? null;
  const resolvedBenchmarkConfigModelId =
    cost.benchmark_config_model_id ?? inferredLineage?.benchmark_config_model_id ?? null;

  if ((resolvedAgentId || cost.decision_id) && (!resolvedFamilyId || !resolvedReleaseId || !resolvedBenchmarkConfigModelId)) {
    throw new Error('API cost rows linked to a cohort agent must carry complete frozen lineage');
  }

  if (existing) {
    db.prepare(`
      UPDATE api_costs
      SET model_id = ?,
          agent_id = ?,
          family_id = ?,
          release_id = ?,
          benchmark_config_model_id = ?,
          tokens_input = ?,
          tokens_output = ?,
          cost_usd = ?
      WHERE id = ?
    `).run(
      cost.model_id,
      resolvedAgentId,
      resolvedFamilyId,
      resolvedReleaseId,
      resolvedBenchmarkConfigModelId,
      cost.tokens_input,
      cost.tokens_output,
      cost.cost_usd,
      id
    );
  } else {
    db.prepare(`
      INSERT INTO api_costs (
        id,
        model_id,
        agent_id,
        family_id,
        release_id,
        benchmark_config_model_id,
        decision_id,
        tokens_input,
        tokens_output,
        cost_usd
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cost.model_id,
      resolvedAgentId,
      resolvedFamilyId,
      resolvedReleaseId,
      resolvedBenchmarkConfigModelId,
      cost.decision_id,
      cost.tokens_input,
      cost.tokens_output,
      cost.cost_usd
    );
  }

  return db.prepare('SELECT * FROM api_costs WHERE id = ?').get(id) as ApiCost;
}

export function getTotalCostsByModel(): Record<string, number> {
  const db = getDb();
  const results = db.prepare(`
    SELECT COALESCE(family_id, model_id) as model_id, SUM(cost_usd) as total_cost
    FROM api_costs
    GROUP BY COALESCE(family_id, model_id)
  `).all() as { model_id: string; total_cost: number }[];

  const costs: Record<string, number> = {};
  for (const result of results) {
    costs[result.model_id] = result.total_cost;
  }

  return costs;
}
