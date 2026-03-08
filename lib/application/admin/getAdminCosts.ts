import { getDb } from '@/lib/db';
import { getActiveModelFamilies } from '@/lib/db/queries';

type RawModelCost = {
  family_slug: string;
  family_id: string | null;
  legacy_model_id: string | null;
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
      COALESCE(abi.family_slug, abi.family_id, abi.legacy_model_id, a.model_id) as family_slug,
      abi.family_id,
      abi.legacy_model_id as legacy_model_id,
      COALESCE(abi.family_display_name, abi.release_display_name, a.model_id) as model_name,
      COALESCE(abi.color, '#94A3B8') as color,
      COALESCE(SUM(d.api_cost_usd), 0) as total_cost,
      COALESCE(SUM(d.tokens_input), 0) as total_input_tokens,
      COALESCE(SUM(d.tokens_output), 0) as total_output_tokens,
      COUNT(d.id) as decision_count
    FROM agents a
    LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
    LEFT JOIN decisions d ON a.id = d.agent_id
    GROUP BY
      COALESCE(abi.family_slug, abi.family_id, abi.legacy_model_id, a.model_id),
      abi.family_id,
      abi.legacy_model_id,
      COALESCE(abi.family_display_name, abi.release_display_name, a.model_id),
      COALESCE(abi.color, '#94A3B8')
    ORDER BY total_cost DESC
  `).all() as RawModelCost[];

  const families = getActiveModelFamilies();
  const familyById = new Map(families.map((family) => [family.id, family]));

  const costsByModel = families.map((family) => {
    const familySlug = family.slug ?? family.id;
    const existing = rawCosts.find((cost) => (
      cost.family_id === family.id ||
      cost.family_slug === familySlug
    ));
    return existing || {
      family_slug: familySlug,
      family_id: family.id,
      legacy_model_id: family.legacy_model_id,
      model_name: family.public_display_name,
      color: family.color ?? '#94A3B8',
      total_cost: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      decision_count: 0
    };
  }).map((cost) => ({
    ...cost,
    family_slug: cost.family_slug ?? familyById.get(cost.family_id ?? '')?.slug ?? cost.family_id ?? 'unknown-family',
    family_id: cost.family_id,
    legacy_model_id: cost.legacy_model_id ?? familyById.get(cost.family_id ?? '')?.legacy_model_id ?? null
  }));

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
