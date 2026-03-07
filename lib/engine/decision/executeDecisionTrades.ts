import { executeBets, executeSells } from '@/lib/engine/execution';
import type { ParsedDecision } from '@/lib/openrouter/parser';

export interface DecisionTradeExecutionSummary {
  attemptedTrades: number;
  tradesExecuted: number;
  executionErrors: string[];
}

export function executeDecisionTrades(
  agentId: string,
  parsed: ParsedDecision,
  decisionId: string
): DecisionTradeExecutionSummary {
  let tradesExecuted = 0;
  let executionErrors: string[] = [];
  let attemptedTrades = 0;

  if (parsed.action === 'BET' && parsed.bets) {
    const betResults = executeBets(agentId, parsed.bets, decisionId);
    attemptedTrades = parsed.bets.length;
    tradesExecuted = betResults.filter((entry) => entry.success).length;
    executionErrors = betResults
      .filter((entry) => !entry.success && entry.error)
      .map((entry) => entry.error as string);
  } else if (parsed.action === 'SELL' && parsed.sells) {
    const sellResults = executeSells(agentId, parsed.sells, decisionId);
    attemptedTrades = parsed.sells.length;
    tradesExecuted = sellResults.filter((entry) => entry.success).length;
    executionErrors = sellResults
      .filter((entry) => !entry.success && entry.error)
      .map((entry) => entry.error as string);
  }

  return {
    attemptedTrades,
    tradesExecuted,
    executionErrors
  };
}
