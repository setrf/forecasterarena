import { MAX_BET_PERCENT } from '@/lib/constants';
import { withImmediateTransaction } from '@/lib/db';
import { getAgentById } from '@/lib/db/queries';
import { executeBet } from '@/lib/engine/execution/bet';
import type { BetResult } from '@/lib/engine/execution/types';
import type { BetInstruction } from '@/lib/openrouter/parser';

class AtomicBetBatchFailure extends Error {
  constructor(readonly errors: string[]) {
    super(errors.join('; '));
    this.name = 'AtomicBetBatchFailure';
  }
}

export function executeBets(
  agentId: string,
  bets: BetInstruction[],
  decisionId?: string
): BetResult[] {
  return bets.map((bet) => executeBet(agentId, bet, decisionId));
}

function getBetBatchPreflightError(agentId: string, bets: BetInstruction[]): string | null {
  const agent = getAgentById(agentId);
  if (!agent) {
    return 'Agent not found';
  }

  if (agent.status === 'bankrupt') {
    return 'Agent is bankrupt';
  }

  const totalAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const maxAllocation = agent.cash_balance * MAX_BET_PERCENT;

  if (totalAmount > maxAllocation) {
    return (
      `Total BET amount $${totalAmount.toFixed(2)} exceeds ` +
      `maximum decision allocation $${maxAllocation.toFixed(2)}`
    );
  }

  if (totalAmount > agent.cash_balance) {
    return 'Insufficient balance';
  }

  return null;
}

function getAtomicFailureResult(errors: string[]): BetResult[] {
  const uniqueErrors = Array.from(new Set(errors));
  return [{
    success: false,
    error: `BET batch failed; no trades executed: ${uniqueErrors.join('; ')}`
  }];
}

export function executeBetsAtomically(
  agentId: string,
  bets: BetInstruction[],
  decisionId?: string
): BetResult[] {
  if (bets.length === 0) {
    return [];
  }

  const preflightError = getBetBatchPreflightError(agentId, bets);
  if (preflightError) {
    return getAtomicFailureResult([preflightError]);
  }

  try {
    let results: BetResult[] = [];

    withImmediateTransaction(() => {
      results = executeBets(agentId, bets, decisionId);
      const errors = results
        .filter((result) => !result.success)
        .map((result) => result.error || 'Unknown BET execution error');

      if (errors.length > 0) {
        throw new AtomicBetBatchFailure(errors);
      }
    });

    return results;
  } catch (error) {
    if (error instanceof AtomicBetBatchFailure) {
      return getAtomicFailureResult(error.errors);
    }

    throw error;
  }
}
