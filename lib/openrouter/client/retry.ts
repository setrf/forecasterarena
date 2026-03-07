import { callOpenRouter } from '@/lib/openrouter/client/request';
import { OpenRouterError } from '@/lib/openrouter/client/error';
import type { OpenRouterResponse } from '@/lib/openrouter/client/types';

export async function callOpenRouterWithRetry(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  retries: number = 0,
  delayMs: number = 3000
): Promise<OpenRouterResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callOpenRouter(modelId, systemPrompt, userPrompt);
    } catch (error) {
      lastError = error as Error;

      if (error instanceof OpenRouterError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw error;
        }

        if (error.statusCode === 404) {
          throw error;
        }
      }

      if (attempt < retries) {
        console.log(`OpenRouter call failed (${(error as Error).message}), retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }
  }

  throw lastError;
}
