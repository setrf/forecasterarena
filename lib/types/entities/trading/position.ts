export interface Position {
  id: string;
  agent_id: string;
  market_id: string;
  side: string;
  shares: number;
  avg_entry_price: number;
  total_cost: number;
  current_value: number | null;
  unrealized_pnl: number | null;
  status: 'open' | 'closed' | 'settled';
  opened_at: string;
  closed_at: string | null;
}
