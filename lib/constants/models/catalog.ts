export const MODELS = [
  {
    id: 'gpt-5.1',
    openrouterId: 'openai/gpt-5.5',
    displayName: 'GPT-5.5',
    provider: 'OpenAI',
    color: '#10B981'
  },
  {
    id: 'gemini-2.5-flash',
    openrouterId: 'google/gemini-3.1-pro-preview',
    displayName: 'Gemini 3.1 Pro Preview',
    provider: 'Google',
    color: '#3B82F6'
  },
  {
    id: 'grok-4',
    openrouterId: 'x-ai/grok-4.3',
    displayName: 'Grok 4.3',
    provider: 'xAI',
    color: '#8B5CF6'
  },
  {
    id: 'claude-opus-4.5',
    openrouterId: 'anthropic/claude-opus-4.7',
    displayName: 'Claude Opus 4.7',
    provider: 'Anthropic',
    color: '#F59E0B'
  },
  {
    id: 'deepseek-v3.1',
    openrouterId: 'deepseek/deepseek-v4-pro',
    displayName: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    color: '#EF4444'
  },
  {
    id: 'kimi-k2',
    openrouterId: 'moonshotai/kimi-k2.6',
    displayName: 'Kimi K2.6',
    provider: 'Moonshot AI',
    color: '#EC4899'
  },
  {
    id: 'qwen-3-next',
    openrouterId: 'qwen/qwen3.6-max-preview',
    displayName: 'Qwen 3.6 Max Preview',
    provider: 'Alibaba',
    color: '#06B6D4'
  }
] as const;
