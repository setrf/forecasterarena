export const SEEDED_MODELS = [
  { id: 'gpt-5.1', familyId: 'openai-gpt', familySlug: 'openai-gpt', releaseId: 'openai-gpt--gpt-5.5', releaseSlug: 'gpt-5.5', openrouterId: 'openai/gpt-5.5', displayName: 'GPT-5.5', shortDisplayName: 'GPT', provider: 'OpenAI', color: '#10B981', inputPrice: 5, outputPrice: 30 },
  { id: 'gemini-2.5-flash', familyId: 'google-gemini', familySlug: 'google-gemini', releaseId: 'google-gemini--gemini-3.1-pro-preview', releaseSlug: 'gemini-3.1-pro-preview', openrouterId: 'google/gemini-3.1-pro-preview', displayName: 'Gemini 3.1 Pro Preview', shortDisplayName: 'Gemini', provider: 'Google', color: '#3B82F6', inputPrice: 2, outputPrice: 12 },
  { id: 'grok-4', familyId: 'xai-grok', familySlug: 'xai-grok', releaseId: 'xai-grok--grok-4.3', releaseSlug: 'grok-4.3', openrouterId: 'x-ai/grok-4.3', displayName: 'Grok 4.3', shortDisplayName: 'Grok', provider: 'xAI', color: '#8B5CF6', inputPrice: 1.25, outputPrice: 2.5 },
  { id: 'claude-opus-4.5', familyId: 'anthropic-claude-opus', familySlug: 'anthropic-claude-opus', releaseId: 'anthropic-claude-opus--claude-opus-4.7', releaseSlug: 'claude-opus-4.7', openrouterId: 'anthropic/claude-opus-4.7', displayName: 'Claude Opus 4.7', shortDisplayName: 'Claude', provider: 'Anthropic', color: '#F59E0B', inputPrice: 5, outputPrice: 25 },
  { id: 'deepseek-v3.1', familyId: 'deepseek-v3', familySlug: 'deepseek-v3', releaseId: 'deepseek-v3--deepseek-v4-pro', releaseSlug: 'deepseek-v4-pro', openrouterId: 'deepseek/deepseek-v4-pro', displayName: 'DeepSeek V4 Pro', shortDisplayName: 'DeepSeek', provider: 'DeepSeek', color: '#EF4444', inputPrice: 0.435, outputPrice: 0.87 },
  { id: 'kimi-k2', familyId: 'moonshot-kimi', familySlug: 'moonshot-kimi', releaseId: 'moonshot-kimi--kimi-k2.6', releaseSlug: 'kimi-k2.6', openrouterId: 'moonshotai/kimi-k2.6', displayName: 'Kimi K2.6', shortDisplayName: 'Kimi', provider: 'Moonshot AI', color: '#EC4899', inputPrice: 0.74, outputPrice: 3.49 },
  { id: 'qwen-3-next', familyId: 'alibaba-qwen', familySlug: 'alibaba-qwen', releaseId: 'alibaba-qwen--qwen3.6-max-preview', releaseSlug: 'qwen3.6-max-preview', openrouterId: 'qwen/qwen3.6-max-preview', displayName: 'Qwen 3.6 Max Preview', shortDisplayName: 'Qwen', provider: 'Alibaba', color: '#06B6D4', inputPrice: 1.04, outputPrice: 6.24 }
];

export const SEEDED_COHORT_ID = 'cohort-e2e-1';
export const SEEDED_BENCHMARK_CONFIG_ID = 'benchmark-config-e2e-default';
export const SEEDED_MARKET_ID = 'market-e2e-fed';
export const SEEDED_EXPORT_FROM = '2026-03-01T00:00:00Z';
export const SEEDED_EXPORT_TO = '2026-03-07T00:00:00Z';
export const SNAPSHOT_START = '2026-03-02T00:00:00.000Z';
export const SNAPSHOT_END = '2026-03-07T00:00:00.000Z';

const RECENT_SNAPSHOT_END_DATE = new Date();
RECENT_SNAPSHOT_END_DATE.setUTCSeconds(0, 0);

const RECENT_SNAPSHOT_START_DATE = new Date(RECENT_SNAPSHOT_END_DATE);
RECENT_SNAPSHOT_START_DATE.setUTCDate(RECENT_SNAPSHOT_START_DATE.getUTCDate() - 5);

const SEEDED_MARKET_CLOSE_DATE = new Date(RECENT_SNAPSHOT_END_DATE);
SEEDED_MARKET_CLOSE_DATE.setUTCFullYear(SEEDED_MARKET_CLOSE_DATE.getUTCFullYear() + 1);

export const RECENT_SNAPSHOT_START = RECENT_SNAPSHOT_START_DATE.toISOString();
export const RECENT_SNAPSHOT_END = RECENT_SNAPSHOT_END_DATE.toISOString();
export const SEEDED_MARKET_CLOSE = SEEDED_MARKET_CLOSE_DATE.toISOString();
