export const MODELS = [
  {
    id: 'gpt-5.1',
    openrouterId: 'openai/gpt-5.2',
    displayName: 'GPT-5.2',
    provider: 'OpenAI',
    color: '#10B981'
  },
  {
    id: 'gemini-2.5-flash',
    openrouterId: 'google/gemini-3-pro-preview',
    displayName: 'Gemini 3 Pro',
    provider: 'Google',
    color: '#3B82F6'
  },
  {
    id: 'grok-4',
    openrouterId: 'x-ai/grok-4.1-fast',
    displayName: 'Grok 4.1',
    provider: 'xAI',
    color: '#8B5CF6'
  },
  {
    id: 'claude-opus-4.5',
    openrouterId: 'anthropic/claude-opus-4.5',
    displayName: 'Claude Opus 4.5',
    provider: 'Anthropic',
    color: '#F59E0B'
  },
  {
    id: 'deepseek-v3.1',
    openrouterId: 'deepseek/deepseek-v3.2',
    displayName: 'DeepSeek V3.2',
    provider: 'DeepSeek',
    color: '#EF4444'
  },
  {
    id: 'kimi-k2',
    openrouterId: 'moonshotai/kimi-k2-thinking',
    displayName: 'Kimi K2',
    provider: 'Moonshot AI',
    color: '#EC4899'
  },
  {
    id: 'qwen-3-next',
    openrouterId: 'qwen/qwen3-235b-a22b-2507',
    displayName: 'Qwen 3',
    provider: 'Alibaba',
    color: '#06B6D4'
  }
] as const;
