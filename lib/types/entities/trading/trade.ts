export interface Trade {
  id: string;
  agent_id: string;
  market_id: string;
  position_id: string | null;
  decision_id: string | null;
  trade_type: 'BUY' | 'SELL';
  side: string;
  shares: number;
  price: number;
  total_amount: number;
  implied_confidence: number | null;
  cost_basis: number | null;
  realized_pnl: number | null;
  executed_at: string;
}
