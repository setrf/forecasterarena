const EXPECTED_MODELS = [
  'openai/gpt-5.5',
  'google/gemini-3.1-pro-preview',
  'x-ai/grok-4.3',
  'anthropic/claude-opus-4.7',
  'deepseek/deepseek-v4-pro',
  'moonshotai/kimi-k2.6',
  'qwen/qwen3.6-max-preview'
];

const response = await fetch('https://openrouter.ai/api/v1/models');
if (!response.ok) {
  throw new Error(`OpenRouter model catalog request failed: ${response.status} ${response.statusText}`);
}

const payload = await response.json();
const availableIds = new Set((payload.data ?? []).map((model) => model.id));
const missing = EXPECTED_MODELS.filter((modelId) => !availableIds.has(modelId));

if (missing.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    missing_models: missing
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  checked_models: EXPECTED_MODELS
}, null, 2));
