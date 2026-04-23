import { MAX_BET_PERCENT, MIN_BET } from '@/lib/constants';
import type { BetInstruction } from '@/lib/openrouter/parser/types';

export function validateBet(
  bet: BetInstruction,
  agentBalance: number,
  maxBetPercent: number = MAX_BET_PERCENT
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

export function validateBetBatch(
  bets: BetInstruction[],
  agentBalance: number,
  maxBetPercent: number = MAX_BET_PERCENT
): string | null {
  const totalAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const maxAllocation = agentBalance * maxBetPercent;

  if (totalAmount > maxAllocation) {
    return (
      `Total BET amount $${totalAmount.toFixed(2)} exceeds ` +
      `maximum decision allocation $${maxAllocation.toFixed(2)}`
    );
  }

  if (totalAmount > agentBalance) {
    return 'Total BET amount exceeds cash balance';
  }

  return null;
}
