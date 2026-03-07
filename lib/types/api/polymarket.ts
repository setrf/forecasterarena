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
