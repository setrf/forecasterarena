/**
 * OpenRouter client barrel.
 *
 * Public import path preserved while the implementation is split by concern.
 */

export { OpenRouterError } from '@/lib/openrouter/client/error';
export { estimateCostFromSnapshot } from '@/lib/openrouter/client/pricing';
export { callOpenRouter } from '@/lib/openrouter/client/request';
export { callOpenRouterWithRetry } from '@/lib/openrouter/client/retry';
export type {
  ChatMessage,
  OpenRouterResponse,
  TokenUsage
} from '@/lib/openrouter/client/types';
