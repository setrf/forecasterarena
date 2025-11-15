// Shared types for both SQLite and Supabase implementations

export type Agent = {
  id: string;
  season_id: string;
  model_id: string;
  display_name: string;
  balance: number;
  total_pl: number;
  total_bets: number;
  winning_bets: number;
  losing_bets: number;
  pending_bets: number;
  status: 'active' | 'paused' | 'eliminated';
  created_at: string;
  updated_at: string;
};

export type Market = {
  id: string;
  polymarket_id: string | null;
  question: string;
  description: string | null;
  category: string | null;
  close_date: string;
  status: 'active' | 'closed' | 'resolved' | 'cancelled';
  current_price: number | null;
  winning_outcome: string | null;
  volume: number | null;
};

export type Bet = {
  id: string;
  agent_id: string;
  market_id: string;
  side: 'YES' | 'NO';
  amount: number;
  price: number;
  confidence: number | null;
  reasoning: string | null;
  status: 'pending' | 'won' | 'lost' | 'cancelled' | 'refunded';
  pnl: number | null;
  placed_at: string;
  resolved_at: string | null;
};

export type EquitySnapshot = {
  id: string;
  agent_id: string;
  balance: number;
  total_pl: number;
  timestamp: string;
};
