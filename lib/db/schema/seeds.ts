import { MODEL_FAMILY_BOOTSTRAP } from '@/lib/catalog/bootstrap';

export const SEED_METHODOLOGY_SQL = `
INSERT INTO methodology_versions (version, title, description, effective_from_cohort)
VALUES (
  'v1',
  'Forecaster Arena Methodology v1',
  'Initial methodology for LLM forecasting benchmark using Polymarket prediction markets. Features: 7 LLMs competing in weekly cohorts, $10,000 starting balance, Brier score + P/L scoring, temperature 0 for reproducibility.',
  1
),
(
  'v2',
  'Forecaster Arena Methodology v2',
  'Reality-grounded LLM evaluation using unsettled real-world events, top-volume Polymarket markets, paper portfolios, and deterministic portfolio-value ranking. Applies to future cohorts after v2 deployment.',
  NULL
)
ON CONFLICT(version) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  effective_from_cohort = excluded.effective_from_cohort;
`;

export const SEED_MODELS_SQL = `
INSERT INTO models (id, openrouter_id, display_name, provider, color)
VALUES
${MODEL_FAMILY_BOOTSTRAP.map((family) => {
  const values = [
    family.legacyModelId,
    family.initialOpenrouterId,
    family.initialReleaseName,
    family.provider,
    family.color
  ].map((value) => `'${value.replace(/'/g, "''")}'`);
  return `  (${values.join(', ')})`;
}).join(',\n')}
ON CONFLICT(id) DO NOTHING;
`;
