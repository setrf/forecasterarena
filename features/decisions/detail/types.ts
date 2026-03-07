export interface Decision {
  id: string;
  market_id: string;
  agent_id: string;
  parsed_response: string;
  reasoning: string;
  created_at: string;
  model_name: string;
  model_color: string;
  model_provider: string;
}

export interface Trade {
  id: string;
  trade_type: string;
  side: string;
  shares: number;
  price: number;
  total_amount: number;
  executed_at: string;
  market_question: string;
  market_slug: string | null;
  market_event_slug: string | null;
  market_id: string;
}

export interface DecisionDetailData {
  decision: Decision;
  trades: Trade[];
}
