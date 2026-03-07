export const SEED_METHODOLOGY_SQL = `
INSERT INTO methodology_versions (version, title, description, effective_from_cohort)
VALUES (
  'v1',
  'Forecaster Arena Methodology v1',
  'Initial methodology for LLM forecasting benchmark using Polymarket prediction markets. Features: 7 LLMs competing in weekly cohorts, $10,000 starting balance, Brier score + P/L scoring, temperature 0 for reproducibility.',
  1
)
ON CONFLICT(version) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  effective_from_cohort = excluded.effective_from_cohort;
`;

export const SEED_MODELS_SQL = `
INSERT INTO models (id, openrouter_id, display_name, provider, color)
VALUES 
  ('gpt-5.1', 'openai/gpt-5.2', 'GPT-5.2', 'OpenAI', '#10B981'),
  ('gemini-2.5-flash', 'google/gemini-3-pro-preview', 'Gemini 3 Pro', 'Google', '#3B82F6'),
  ('grok-4', 'x-ai/grok-4.1-fast', 'Grok 4.1', 'xAI', '#8B5CF6'),
  ('claude-opus-4.5', 'anthropic/claude-opus-4.5', 'Claude Opus 4.5', 'Anthropic', '#F59E0B'),
  ('deepseek-v3.1', 'deepseek/deepseek-v3.2', 'DeepSeek V3.2', 'DeepSeek', '#EF4444'),
  ('kimi-k2', 'moonshotai/kimi-k2-thinking', 'Kimi K2', 'Moonshot AI', '#EC4899'),
  ('qwen-3-next', 'qwen/qwen3-235b-a22b-2507', 'Qwen 3', 'Alibaba', '#06B6D4')
ON CONFLICT(id) DO UPDATE SET
  openrouter_id = excluded.openrouter_id,
  display_name = excluded.display_name,
  provider = excluded.provider,
  color = excluded.color;
`;
