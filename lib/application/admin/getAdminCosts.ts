import { MODELS } from '@/lib/constants';
import { getDb } from '@/lib/db';

type RawModelCost = {
  model_id: string;
  model_name: string;
  color: string;
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  decision_count: number;
};

export function getAdminCosts() {
  const db = getDb();

  const rawCosts = db.prepare(`
    SELECT
      m.id as model_id,
      m.display_name as model_name,
      m.color,
      COALESCE(SUM(d.api_cost_usd), 0) as total_cost,
      COALESCE(SUM(d.tokens_input), 0) as total_input_tokens,
      COALESCE(SUM(d.tokens_output), 0) as total_output_tokens,
      COUNT(d.id) as decision_count
    FROM models m
    LEFT JOIN agents a ON m.id = a.model_id
    LEFT JOIN decisions d ON a.id = d.agent_id
    GROUP BY m.id, m.display_name, m.color
    ORDER BY total_cost DESC
  `).all() as RawModelCost[];

  const costsByModel = MODELS.map((model) => {
    const existing = rawCosts.find((cost) => cost.model_id === model.id);
    return existing || {
      model_id: model.id,
      model_name: model.displayName,
      color: model.color,
      total_cost: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      decision_count: 0
    };
  });

  const totalCost = costsByModel.reduce((sum, model) => sum + model.total_cost, 0);
  const totalInputTokens = costsByModel.reduce((sum, model) => sum + model.total_input_tokens, 0);
  const totalOutputTokens = costsByModel.reduce((sum, model) => sum + model.total_output_tokens, 0);
  const totalDecisions = costsByModel.reduce((sum, model) => sum + model.decision_count, 0);

  return {
    costs_by_model: costsByModel,
    summary: {
      total_cost: totalCost,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      total_decisions: totalDecisions,
      avg_cost_per_decision: totalDecisions > 0 ? totalCost / totalDecisions : 0
    },
    updated_at: new Date().toISOString()
  };
}
