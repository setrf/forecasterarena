const CURRENT_LINEUP = [
  { family: 'GPT', id: 'openai/gpt-5.5', name: 'GPT-5.5', prefix: 'openai/', required: ['gpt'], avoid: ['mini', 'nano', 'oss'] },
  { family: 'Gemini', id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', prefix: 'google/', required: ['gemini'], avoid: ['flash'] },
  { family: 'Grok', id: 'x-ai/grok-4.3', name: 'Grok 4.3', prefix: 'x-ai/', required: ['grok'], avoid: ['fast', 'mini'] },
  { family: 'Claude', id: 'anthropic/claude-opus-4.7', name: 'Claude Opus 4.7', prefix: 'anthropic/', required: ['claude', 'opus'], avoid: [] },
  { family: 'DeepSeek', id: 'deepseek/deepseek-v4-pro', name: 'DeepSeek V4 Pro', prefix: 'deepseek/', required: ['deepseek'], avoid: ['chat', 'lite'] },
  { family: 'Kimi', id: 'moonshotai/kimi-k2.6', name: 'Kimi K2.6', prefix: 'moonshotai/', required: ['kimi'], avoid: [] },
  { family: 'Qwen', id: 'qwen/qwen3.6-max-preview', name: 'Qwen 3.6 Max Preview', prefix: 'qwen/', required: ['qwen', 'max'], avoid: ['coder', 'plus', 'thinking'] }
];

const EXCLUDED = [
  'audio',
  'coder',
  'codex',
  'coding',
  'computer-use',
  'custom-tools',
  'embed',
  'embedding',
  'free',
  'image',
  'moderation',
  'rerank',
  'speech',
  'transcription',
  'tts',
  'whisper'
];

function text(model) {
  return [model.id, model.name, JSON.stringify(model.architecture ?? '')]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function versionParts(value) {
  const normalized = value
    .replace(/\b20\d{2}[-_/]\d{1,2}[-_/]\d{1,2}\b/g, ' ')
    .replace(/[-_/](?:0?[1-9]|1[0-2])(?:[0-3]\d)\b/g, ' ');
  return Array.from(normalized.matchAll(/\d+(?:\.\d+)?/g))
    .filter((match) => match[0].replace('.', '').length <= 2)
    .map((match) => Number(match[0]))
    .filter((number) => Number.isFinite(number) && number < 2000)
    .flatMap((number) => String(number).split('.').map((part) => Number(part)));
}

function compareVersions(left, right) {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function pricePerMillion(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Number((numeric > 0.01 ? numeric : numeric * 1_000_000).toFixed(6));
}

const response = await fetch('https://openrouter.ai/api/v1/models');
if (!response.ok) {
  throw new Error(`OpenRouter model catalog request failed: ${response.status} ${response.statusText}`);
}

const payload = await response.json();
const models = Array.isArray(payload.data) ? payload.data : [];
const report = CURRENT_LINEUP.map((family) => {
  const currentVersion = versionParts(`${family.id} ${family.name}`);
  const candidates = models
    .filter((model) => typeof model.id === 'string' && model.id.toLowerCase().startsWith(family.prefix))
    .filter((model) => family.required.every((fragment) => text(model).includes(fragment)))
    .filter((model) => ![...EXCLUDED, ...family.avoid].some((fragment) => text(model).includes(fragment)))
    .map((model) => ({ model, version: versionParts(`${model.id} ${model.name ?? ''}`) }))
    .filter((entry) => compareVersions(entry.version, currentVersion) > 0)
    .sort((left, right) => compareVersions(right.version, left.version));

  const best = candidates[0]?.model;
  return {
    family: family.family,
    current: family.id,
    candidate: best?.id ?? null,
    candidate_name: best?.name ?? null,
    input_price_per_million: best ? pricePerMillion(best.pricing?.prompt) : null,
    output_price_per_million: best ? pricePerMillion(best.pricing?.completion) : null,
    status: best ? 'review' : 'unchanged'
  };
});

console.log(JSON.stringify({
  ok: true,
  checked_models: models.length,
  report
}, null, 2));
