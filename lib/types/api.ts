/**
 * External API payload types.
 */
export interface ParsedDecision {
  action: 'BET' | 'SELL' | 'HOLD' | 'ERROR';
  bets?: Array<{
    market_id: string;
    side: string;
    amount: number;
  }>;
  sells?: Array<{
    position_id: string;
    percentage: number;
  }>;
  reasoning: string;
  error?: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  description?: string;
  end_date_iso: string;
  tokens: Array<{
    outcome: string;
    token_id: string;
    price: string;
    winner?: boolean;
  }>;
  closed: boolean;
  archived: boolean;
  active: boolean;
  category?: string;
  liquidity?: string;
  volume?: string;
  resolving?: boolean;
  resolved?: boolean;
}
