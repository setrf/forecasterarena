import { executeBets, executeSells } from '@/lib/engine/execution';
import type { ParsedDecision } from '@/lib/openrouter/parser';
import type { BetResult, SellResult } from '@/lib/engine/execution';

export interface DecisionTradeExecutionSummary {
  attemptedTrades: number;
  tradesExecuted: number;
  executionErrors: string[];
}

function countSuccessfulTrades(results: Array<BetResult | SellResult>): number {
  return results.filter((entry) => entry.success).length;
}

function collectExecutionErrors(results: Array<BetResult | SellResult>): string[] {
  return results
    .filter((entry) => !entry.success && entry.error)
    .map((entry) => entry.error as string);
}

export function executeDecisionTrades(
  agentId: string,
  parsed: ParsedDecision,
  decisionId: string
): DecisionTradeExecutionSummary {
  let results: Array<BetResult | SellResult> = [];
  let attemptedTrades = 0;

  if (parsed.action === 'BET' && parsed.bets) {
    attemptedTrades = parsed.bets.length;
    results = executeBets(agentId, parsed.bets, decisionId);

    const failedBets = parsed.bets.filter((_, index) => !results[index]?.success);
    if (failedBets.length > 0) {
      const retryResults = executeBets(agentId, failedBets, decisionId);
      let retryIndex = 0;
      results = results.map((entry) => {
        if (entry.success) {
          return entry;
        }

        const retriedEntry = retryResults[retryIndex];
        retryIndex += 1;
        return retriedEntry ?? entry;
      });
    }
  } else if (parsed.action === 'SELL' && parsed.sells) {
    attemptedTrades = parsed.sells.length;
    results = executeSells(agentId, parsed.sells, decisionId);

    const failedSells = parsed.sells.filter((_, index) => !results[index]?.success);
    if (failedSells.length > 0) {
      const retryResults = executeSells(agentId, failedSells, decisionId);
      let retryIndex = 0;
      results = results.map((entry) => {
        if (entry.success) {
          return entry;
        }

        const retriedEntry = retryResults[retryIndex];
        retryIndex += 1;
        return retriedEntry ?? entry;
      });
    }
  }

  return {
    attemptedTrades,
    tradesExecuted: countSuccessfulTrades(results),
    executionErrors: collectExecutionErrors(results)
  };
}
