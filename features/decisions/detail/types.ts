export interface Decision {
  id: string;
  market_id?: string | null;
  agent_id: string;
  parsed_response: string | null;
  reasoning: string;
  created_at: string;
  model_name: string;
  model_color: string;
  model_provider: string;
  family_slug: string;
  legacy_model_id?: string | null;
  model_family_id?: string | null;
  model_release_id?: string | null;
  model_release_name?: string | null;
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
