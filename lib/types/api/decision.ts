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
