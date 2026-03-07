import type { TokenUsage } from '@/lib/openrouter/client/types';

const PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  'openai/gpt-5.2': { input: 5, output: 15 },
  'anthropic/claude-opus-4.5': { input: 15, output: 75 },
  'google/gemini-3-pro-preview': { input: 2.5, output: 10 },
  'x-ai/grok-4.1-fast': { input: 5, output: 15 },
  'deepseek/deepseek-v3.2': { input: 0.5, output: 2 },
  'moonshotai/kimi-k2-thinking': { input: 1, output: 4 },
  'qwen/qwen3-235b-a22b-2507': { input: 1, output: 4 },
};

export function estimateCost(usage: TokenUsage, modelId: string): number {
  const pricing = PRICING_PER_MILLION[modelId] || { input: 2, output: 8 };
  const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
  const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}
