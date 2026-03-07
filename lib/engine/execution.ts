/**
 * Trade Execution Engine
 *
 * Handles the execution of BET and SELL decisions.
 * All trades are simulated (paper trading).
 *
 * @module engine/execution
 */

import { executeBet } from '@/lib/engine/execution/bet';
import { executeSell } from '@/lib/engine/execution/sell';
import type { BetResult, SellResult } from '@/lib/engine/execution/types';
import type { BetInstruction, SellInstruction } from '@/lib/openrouter/parser';

export type { BetResult, SellResult } from '@/lib/engine/execution/types';
export { executeBet } from '@/lib/engine/execution/bet';
export { executeSell } from '@/lib/engine/execution/sell';

export function executeBets(
  agentId: string,
  bets: BetInstruction[],
  decisionId?: string
): BetResult[] {
  return bets.map((bet) => executeBet(agentId, bet, decisionId));
}

export function executeSells(
  agentId: string,
  sells: SellInstruction[],
  decisionId?: string
): SellResult[] {
  return sells.map((sell) => executeSell(agentId, sell, decisionId));
}
