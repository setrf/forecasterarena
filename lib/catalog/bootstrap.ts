export interface ModelFamilyBootstrap {
  familyId: string;
  slug: string;
  legacyModelId: string;
  familyName: string;
  publicDisplayName: string;
  shortDisplayName: string;
  provider: string;
  color: string;
  sortOrder: number;
  initialReleaseName: string;
  initialReleaseSlug: string;
  initialOpenrouterId: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}

export const MODEL_FAMILY_BOOTSTRAP: ModelFamilyBootstrap[] = [
  {
    familyId: 'openai-gpt',
    slug: 'openai-gpt',
    legacyModelId: 'gpt-5.1',
    familyName: 'OpenAI GPT',
    publicDisplayName: 'GPT',
    shortDisplayName: 'GPT',
    provider: 'OpenAI',
    color: '#10B981',
    sortOrder: 1,
    initialReleaseName: 'GPT-5.5',
    initialReleaseSlug: 'gpt-5.5',
    initialOpenrouterId: 'openai/gpt-5.5',
    inputPricePerMillion: 5,
    outputPricePerMillion: 30
  },
  {
    familyId: 'google-gemini',
    slug: 'google-gemini',
    legacyModelId: 'gemini-2.5-flash',
    familyName: 'Google Gemini',
    publicDisplayName: 'Gemini',
    shortDisplayName: 'Gemini',
    provider: 'Google',
    color: '#3B82F6',
    sortOrder: 2,
    initialReleaseName: 'Gemini 3.1 Pro Preview',
    initialReleaseSlug: 'gemini-3.1-pro-preview',
    initialOpenrouterId: 'google/gemini-3.1-pro-preview',
    inputPricePerMillion: 2,
    outputPricePerMillion: 12
  },
  {
    familyId: 'xai-grok',
    slug: 'xai-grok',
    legacyModelId: 'grok-4',
    familyName: 'xAI Grok',
    publicDisplayName: 'Grok',
    shortDisplayName: 'Grok',
    provider: 'xAI',
    color: '#8B5CF6',
    sortOrder: 3,
    initialReleaseName: 'Grok 4.3',
    initialReleaseSlug: 'grok-4.3',
    initialOpenrouterId: 'x-ai/grok-4.3',
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 2.5
  },
  {
    familyId: 'anthropic-claude-opus',
    slug: 'anthropic-claude-opus',
    legacyModelId: 'claude-opus-4.5',
    familyName: 'Anthropic Claude Opus',
    publicDisplayName: 'Claude',
    shortDisplayName: 'Claude',
    provider: 'Anthropic',
    color: '#F59E0B',
    sortOrder: 4,
    initialReleaseName: 'Claude Opus 4.7',
    initialReleaseSlug: 'claude-opus-4.7',
    initialOpenrouterId: 'anthropic/claude-opus-4.7',
    inputPricePerMillion: 5,
    outputPricePerMillion: 25
  },
  {
    familyId: 'deepseek-v3',
    slug: 'deepseek-v3',
    legacyModelId: 'deepseek-v3.1',
    familyName: 'DeepSeek V3',
    publicDisplayName: 'DeepSeek',
    shortDisplayName: 'DeepSeek',
    provider: 'DeepSeek',
    color: '#EF4444',
    sortOrder: 5,
    initialReleaseName: 'DeepSeek V4 Pro',
    initialReleaseSlug: 'deepseek-v4-pro',
    initialOpenrouterId: 'deepseek/deepseek-v4-pro',
    inputPricePerMillion: 0.435,
    outputPricePerMillion: 0.87
  },
  {
    familyId: 'moonshot-kimi',
    slug: 'moonshot-kimi',
    legacyModelId: 'kimi-k2',
    familyName: 'Moonshot Kimi',
    publicDisplayName: 'Kimi',
    shortDisplayName: 'Kimi',
    provider: 'Moonshot AI',
    color: '#EC4899',
    sortOrder: 6,
    initialReleaseName: 'Kimi K2.6',
    initialReleaseSlug: 'kimi-k2.6',
    initialOpenrouterId: 'moonshotai/kimi-k2.6',
    inputPricePerMillion: 0.74,
    outputPricePerMillion: 3.49
  },
  {
    familyId: 'alibaba-qwen',
    slug: 'alibaba-qwen',
    legacyModelId: 'qwen-3-next',
    familyName: 'Alibaba Qwen',
    publicDisplayName: 'Qwen',
    shortDisplayName: 'Qwen',
    provider: 'Alibaba',
    color: '#06B6D4',
    sortOrder: 7,
    initialReleaseName: 'Qwen 3.6 Max Preview',
    initialReleaseSlug: 'qwen3.6-max-preview',
    initialOpenrouterId: 'qwen/qwen3.6-max-preview',
    inputPricePerMillion: 1.04,
    outputPricePerMillion: 6.24
  }
];

export function findBootstrapFamilyByLegacyModelId(modelId: string) {
  return MODEL_FAMILY_BOOTSTRAP.find((family) => family.legacyModelId === modelId);
}

export function findBootstrapFamilyByFamilyId(familyId: string) {
  return MODEL_FAMILY_BOOTSTRAP.find((family) => family.familyId === familyId);
}
