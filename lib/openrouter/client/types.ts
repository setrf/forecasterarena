export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  finish_reason: string;
  response_time_ms: number;
}
