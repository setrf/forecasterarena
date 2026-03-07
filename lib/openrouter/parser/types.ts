export interface BetInstruction {
  market_id: string;
  side: 'YES' | 'NO' | string;
  amount: number;
}

export interface SellInstruction {
  position_id: string;
  percentage: number;
}

export interface ParsedDecision {
  action: 'BET' | 'SELL' | 'HOLD' | 'ERROR';
  bets?: BetInstruction[];
  sells?: SellInstruction[];
  reasoning: string;
  error?: string;
}

export type SupportedAction = 'BET' | 'SELL' | 'HOLD';

export type Envelope = {
  action: SupportedAction;
  reasoning: string;
};
