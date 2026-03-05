import { generateId, getDb } from '../index';
import type { ApiCost } from '../../types';

export function createApiCost(cost: {
  model_id: string;
  decision_id?: string;
  tokens_input?: number;
  tokens_output?: number;
  cost_usd?: number;
}): ApiCost {
  const db = getDb();
  const id = generateId();

  db.prepare(`
    INSERT INTO api_costs (id, model_id, decision_id, tokens_input, tokens_output, cost_usd)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, cost.model_id, cost.decision_id, cost.tokens_input, cost.tokens_output, cost.cost_usd);

  return db.prepare('SELECT * FROM api_costs WHERE id = ?').get(id) as ApiCost;
}

export function getTotalCostsByModel(): Record<string, number> {
  const db = getDb();
  const results = db.prepare(`
    SELECT model_id, SUM(cost_usd) as total_cost
    FROM api_costs
    GROUP BY model_id
  `).all() as { model_id: string; total_cost: number }[];

  const costs: Record<string, number> = {};
  for (const result of results) {
    costs[result.model_id] = result.total_cost;
  }

  return costs;
}
