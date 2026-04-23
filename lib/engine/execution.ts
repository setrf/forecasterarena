/**
 * Trade Execution Engine
 *
 * Handles the execution of BET and SELL decisions.
 * All trades are simulated (paper trading).
 *
 * @module engine/execution
 */

import { executeSell } from '@/lib/engine/execution/sell';
import type { SellResult } from '@/lib/engine/execution/types';
import type { SellInstruction } from '@/lib/openrouter/parser';

export type { BetResult, SellResult } from '@/lib/engine/execution/types';
export { executeBet } from '@/lib/engine/execution/bet';
export { executeBets, executeBetsAtomically } from '@/lib/engine/execution/bets';
export { executeSell } from '@/lib/engine/execution/sell';

export function executeSells(
  agentId: string,
  sells: SellInstruction[],
  decisionId?: string
): SellResult[] {
  return sells.map((sell) => executeSell(agentId, sell, decisionId));
}
