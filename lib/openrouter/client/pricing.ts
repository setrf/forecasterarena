import type { TokenUsage } from '@/lib/openrouter/client/types';

const PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  'openai/gpt-5.2': { input: 5, output: 15 },
  'openai/gpt-5.5': { input: 5, output: 30 },
  'anthropic/claude-opus-4.5': { input: 15, output: 75 },
  'anthropic/claude-opus-4.7': { input: 5, output: 25 },
  'google/gemini-3-pro-preview': { input: 2.5, output: 10 },
  'google/gemini-3.1-pro-preview': { input: 2, output: 12 },
  'x-ai/grok-4.1-fast': { input: 5, output: 15 },
  'x-ai/grok-4.3': { input: 1.25, output: 2.5 },
  'deepseek/deepseek-v3.2': { input: 0.5, output: 2 },
  'deepseek/deepseek-v4-pro': { input: 0.435, output: 0.87 },
  'moonshotai/kimi-k2-thinking': { input: 1, output: 4 },
  'moonshotai/kimi-k2.6': { input: 0.74, output: 3.49 },
  'qwen/qwen3-235b-a22b-2507': { input: 1, output: 4 },
  'qwen/qwen3.6-max-preview': { input: 1.04, output: 6.24 },
};

export function estimateCostFromSnapshot(
  usage: TokenUsage,
  pricing: { input: number; output: number }
): number {
  const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
  const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

export function estimateCost(usage: TokenUsage, modelId: string): number {
  const pricing = PRICING_PER_MILLION[modelId] || { input: 2, output: 8 };
  return estimateCostFromSnapshot(usage, pricing);
}
