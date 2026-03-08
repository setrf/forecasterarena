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
    initialReleaseName: 'GPT-5.2',
    initialReleaseSlug: 'gpt-5.2',
    initialOpenrouterId: 'openai/gpt-5.2',
    inputPricePerMillion: 5,
    outputPricePerMillion: 15
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
    initialReleaseName: 'Gemini 3 Pro',
    initialReleaseSlug: 'gemini-3-pro',
    initialOpenrouterId: 'google/gemini-3-pro-preview',
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 10
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
    initialReleaseName: 'Grok 4.1',
    initialReleaseSlug: 'grok-4.1',
    initialOpenrouterId: 'x-ai/grok-4.1-fast',
    inputPricePerMillion: 5,
    outputPricePerMillion: 15
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
    initialReleaseName: 'Claude Opus 4.5',
    initialReleaseSlug: 'claude-opus-4.5',
    initialOpenrouterId: 'anthropic/claude-opus-4.5',
    inputPricePerMillion: 15,
    outputPricePerMillion: 75
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
    initialReleaseName: 'DeepSeek V3.2',
    initialReleaseSlug: 'deepseek-v3.2',
    initialOpenrouterId: 'deepseek/deepseek-v3.2',
    inputPricePerMillion: 0.5,
    outputPricePerMillion: 2
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
    initialReleaseName: 'Kimi K2',
    initialReleaseSlug: 'kimi-k2',
    initialOpenrouterId: 'moonshotai/kimi-k2-thinking',
    inputPricePerMillion: 1,
    outputPricePerMillion: 4
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
    initialReleaseName: 'Qwen 3',
    initialReleaseSlug: 'qwen-3',
    initialOpenrouterId: 'qwen/qwen3-235b-a22b-2507',
    inputPricePerMillion: 1,
    outputPricePerMillion: 4
  }
];

export function findBootstrapFamilyByLegacyModelId(modelId: string) {
  return MODEL_FAMILY_BOOTSTRAP.find((family) => family.legacyModelId === modelId);
}

export function findBootstrapFamilyByFamilyId(familyId: string) {
  return MODEL_FAMILY_BOOTSTRAP.find((family) => family.familyId === familyId);
}
