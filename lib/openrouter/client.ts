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
  if (!OPENROUTER_API_KEY) {
    throw new OpenRouterError('OPENROUTER_API_KEY not configured');
  }
  
  const startTime = Date.now();
  
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  const requestBody = {
    model: modelId,
    messages,
    temperature: LLM_TEMPERATURE,
    max_tokens: LLM_MAX_TOKENS,
  };
  
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
  });
  
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
    throw new OpenRouterError(
      data.error.message || 'Unknown OpenRouter error',
      data.error.code
    );
  }
  
  // Extract content from response
  const choice = data.choices?.[0];
  if (!choice?.message?.content) {
    throw new OpenRouterError('No content in OpenRouter response');
  }
  
  return {
    content: choice.message.content,
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
  retries: number = 2,
  delayMs: number = 2000
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
        console.log(`OpenRouter call failed, retrying in ${delayMs}ms...`);
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
  // Very rough estimates - actual pricing varies significantly
  // These should be updated based on OpenRouter's pricing
  const pricingPerMillion: Record<string, { input: number; output: number }> = {
    'openai/gpt-5.1': { input: 5, output: 15 },
    'anthropic/claude-opus-4.5': { input: 15, output: 75 },
    'google/gemini-3-pro-preview': { input: 2.5, output: 10 },
    'x-ai/grok-4': { input: 5, output: 15 },
    'deepseek/deepseek-v3-0324': { input: 0.5, output: 2 },
    'moonshotai/kimi-k2-thinking': { input: 1, output: 4 },
    'qwen/qwen3-235b-a22b-instruct-2507': { input: 1, output: 4 },
  };
  
  const pricing = pricingPerMillion[modelId] || { input: 2, output: 8 };
  
  const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
  const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output;
  
  return inputCost + outputCost;
}


