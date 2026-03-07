import {
  LLM_MAX_TOKENS,
  LLM_TEMPERATURE,
  LLM_TIMEOUT_MS,
  OPENROUTER_API_KEY,
  OPENROUTER_API_URL,
  SITE_NAME,
  SITE_URL
} from '@/lib/constants';
import { OpenRouterError } from '@/lib/openrouter/client/error';
import type {
  ChatMessage,
  OpenRouterResponse,
  TokenUsage
} from '@/lib/openrouter/client/types';

function buildMessages(systemPrompt: string, userPrompt: string): ChatMessage[] {
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

function isThinkingModel(modelId: string): boolean {
  return modelId.includes('gemini-3') || modelId.includes('kimi-k2');
}

function buildRequestBody(modelId: string, messages: ChatMessage[]): Record<string, unknown> {
  const requestBody: Record<string, unknown> = {
    model: modelId,
    messages,
    temperature: LLM_TEMPERATURE,
    max_tokens: LLM_MAX_TOKENS,
  };

  if (isThinkingModel(modelId)) {
    requestBody.reasoning = {
      max_tokens: 4000,
    };
  }

  return requestBody;
}

function getContentOrThrow(data: any): string {
  const choice = data.choices?.[0];
  const message = choice?.message;
  let content = message?.content;

  if (content === null || content === undefined) {
    content = message?.reasoning;
  }

  if (!content) {
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

  return content;
}

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
  const messages = buildMessages(systemPrompt, userPrompt);
  const requestBody = buildRequestBody(modelId, messages);

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

  const data: any = await response.json();

  if (data.error) {
    const errorDetails = JSON.stringify(data.error);
    console.error(`OpenRouter error for ${modelId}: ${errorDetails}`);
    throw new OpenRouterError(
      data.error.message || 'Unknown OpenRouter error',
      data.error.code,
      errorDetails
    );
  }

  const choice = data.choices?.[0];

  return {
    content: getContentOrThrow(data),
    usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    model: data.model || modelId,
    finish_reason: choice.finish_reason || 'unknown',
    response_time_ms: responseTime,
  };
}
