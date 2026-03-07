import { MIN_BET } from '@/lib/constants';
import type { BetInstruction } from '@/lib/openrouter/parser/types';

export function validateBet(
  bet: BetInstruction,
  agentBalance: number,
  maxBetPercent: number = 0.25
): string | null {
  if (!bet.market_id) {
    return 'Missing market_id';
  }

  if (!bet.side) {
    return 'Missing side';
  }

  if (typeof bet.amount !== 'number' || Number.isNaN(bet.amount)) {
    return 'Invalid amount';
  }

  if (!bet.side.trim()) {
    return 'Side cannot be empty';
  }

  if (bet.amount < MIN_BET) {
    return `Bet amount $${bet.amount} is below minimum $${MIN_BET}`;
  }

  const maxBet = agentBalance * maxBetPercent;
  if (bet.amount > maxBet) {
    return `Bet amount $${bet.amount} exceeds maximum $${maxBet.toFixed(2)}`;
  }

  return null;
}
