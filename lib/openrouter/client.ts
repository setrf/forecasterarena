/**
 * OpenRouter API Client
 * 
 * Client for calling LLM models through OpenRouter's unified API.
 * Handles authentication, rate limiting, and error handling.
 * 
 * @see https://openrouter.ai/docs
 * @module openrouter/client
 */

import { 
  OPENROUTER_API_KEY, 
  OPENROUTER_API_URL,
  LLM_TEMPERATURE,
  LLM_MAX_TOKENS,
  LLM_TIMEOUT_MS,
  SITE_URL,
  SITE_NAME
} from '../constants';

/**
 * Message format for OpenRouter API
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Usage information from OpenRouter response
 */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Response from OpenRouter API
 */
export interface OpenRouterResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  finish_reason: string;
  response_time_ms: number;
}

/**
 * Error from OpenRouter API
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

/**
 * Call OpenRouter API with a chat completion request
 * 
 * @param modelId - OpenRouter model ID (e.g., 'openai/gpt-5.1')
 * @param systemPrompt - System message
 * @param userPrompt - User message
 * @returns API response with content and usage
 */
export async function callOpenRouter(
  modelId: string,
  systemPrompt: string,
  userPrompt: string
): Promise<OpenRouterResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  if (!OPENROUTER_API_KEY) {
    throw new OpenRouterError('OPENROUTER_API_KEY not configured');
  }
  
  const startTime = Date.now();
  
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  // Build request body with model-specific reasoning configuration
  // Thinking models (Gemini 3 Pro, etc.) need reasoning limits to prevent
  // exhausting all tokens on internal reasoning before producing output
  const isThinkingModel = modelId.includes('gemini-3') || modelId.includes('kimi-k2');

  const requestBody: Record<string, unknown> = {
    model: modelId,
    messages,
    temperature: LLM_TEMPERATURE,
    max_tokens: LLM_MAX_TOKENS,
  };

  // Add reasoning limits for thinking models
  // Using max_tokens to cap reasoning at 4k tokens, leaving room for actual output
  if (isThinkingModel) {
    requestBody.reasoning = {
      max_tokens: 4000,  // Cap reasoning tokens, ensuring output completes
    };
  }
  
  console.log(`Calling OpenRouter: ${modelId}`);
  
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': SITE_URL,
      'X-Title': SITE_NAME,
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal
  }).catch((error) => {
    if (error.name === 'AbortError') {
      throw new OpenRouterError(`OpenRouter request timed out after ${LLM_TIMEOUT_MS}ms`);
    }
    throw error;
  }).finally(() => clearTimeout(timeoutId));
  
  const responseTime = Date.now() - startTime;
  
  if (!response.ok) {
    const body = await response.text();
    throw new OpenRouterError(
      `OpenRouter API error: ${response.status} ${response.statusText}`,
      response.status,
      body
    );
  }
  
  const data = await response.json();
  
  // Handle error in response body
  if (data.error) {
    const errorDetails = JSON.stringify(data.error);
    console.error(`OpenRouter error for ${modelId}: ${errorDetails}`);
    throw new OpenRouterError(
      data.error.message || 'Unknown OpenRouter error',
      data.error.code,
      errorDetails
    );
  }
  
  // Extract content from response
  // Thinking models like Gemini 3 Pro have both 'content' and 'reasoning' fields:
  // - 'content': The actual response (may be empty if model exhausted tokens on reasoning)
  // - 'reasoning': Internal thinking (not suitable as a substitute for content)
  // Only use 'reasoning' as fallback if 'content' is null/undefined (not empty string)
  const choice = data.choices?.[0];
  const message = choice?.message;

  // Get content, treating empty string as a valid but empty response
  let content = message?.content;

  // If content is null/undefined (not just empty), check reasoning as fallback
  // This handles older models that put output in reasoning field
  if (content === null || content === undefined) {
    content = message?.reasoning;
  }

  // If content is still null/undefined OR is empty string, that's an error
  if (!content) {
    // Provide more context about why it failed
    const hasReasoning = message?.reasoning && message.reasoning.length > 0;
    const finishReason = choice?.finish_reason;

    if (hasReasoning && finishReason === 'length') {
      throw new OpenRouterError(
        'Model exhausted tokens on reasoning before producing output. ' +
        'Consider increasing max_tokens for thinking models.'
      );
    }
    throw new OpenRouterError('No content in OpenRouter response');
  }

  return {
    content: content,
    usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    model: data.model || modelId,
    finish_reason: choice.finish_reason || 'unknown',
    response_time_ms: responseTime,
  };
}

/**
 * Call OpenRouter with retry logic
 * 
 * @param modelId - OpenRouter model ID
 * @param systemPrompt - System message
 * @param userPrompt - User message
 * @param retries - Number of retries on failure
 * @param delayMs - Delay between retries in ms
 * @returns API response
 */
export async function callOpenRouterWithRetry(
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  retries: number = 4,
  delayMs: number = 3000
): Promise<OpenRouterResponse> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callOpenRouter(modelId, systemPrompt, userPrompt);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof OpenRouterError) {
        // Don't retry on auth errors
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw error;
        }
        // Don't retry on invalid model
        if (error.statusCode === 404) {
          throw error;
        }
      }
      
      if (attempt < retries) {
        console.log(`OpenRouter call failed (${(error as Error).message}), retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

/**
 * Estimate cost of an API call
 * 
 * Note: This is an estimate. Actual pricing may vary by model.
 * 
 * @param usage - Token usage from response
 * @param modelId - Model ID for pricing lookup
 * @returns Estimated cost in USD
 */
export function estimateCost(usage: TokenUsage, modelId: string): number {
  // Model pricing per million tokens (updated to match constants.ts model IDs)
  const pricingPerMillion: Record<string, { input: number; output: number }> = {
    'openai/gpt-5.2': { input: 5, output: 15 },
    'anthropic/claude-opus-4.5': { input: 15, output: 75 },
    'google/gemini-3-pro-preview': { input: 2.5, output: 10 },
    'x-ai/grok-4.1-fast': { input: 5, output: 15 },
    'deepseek/deepseek-v3.2': { input: 0.5, output: 2 },
    'moonshotai/kimi-k2-thinking': { input: 1, output: 4 },
    'qwen/qwen3-235b-a22b-instruct-2507': { input: 1, output: 4 },
  };
  
  const pricing = pricingPerMillion[modelId] || { input: 2, output: 8 };
  
  const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
  const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output;
  
  return inputCost + outputCost;
}


