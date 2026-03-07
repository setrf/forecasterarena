import type { Agent, Market } from '@/lib/types';

export interface PositionForPrompt {
  id: string;
  market_question: string;
  side: string;
  shares: number;
  avg_entry_price: number;
  current_price: number;
  current_value: number;
  unrealized_pnl: number;
}

export interface UserPromptArgs {
  agent: Agent;
  positions: PositionForPrompt[];
  markets: Market[];
  cohortWeek: number;
}
