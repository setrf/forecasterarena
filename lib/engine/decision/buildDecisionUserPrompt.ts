import { getPositionsWithMarkets } from '@/lib/db/queries';
import { buildUserPrompt } from '@/lib/openrouter/prompts';
import type { AgentWithModel, Market } from '@/lib/types';

export function buildDecisionUserPrompt(
  agent: AgentWithModel,
  markets: Market[],
  weekNumber: number
): string {
  const positions = getPositionsWithMarkets(agent.id);

  return buildUserPrompt(
    {
      id: agent.id,
      cohort_id: agent.cohort_id,
      model_id: agent.model_id,
      cash_balance: agent.cash_balance,
      total_invested: agent.total_invested,
      status: agent.status,
      created_at: ''
    },
    positions.map((position) => {
      const normalizedSide = position.side.toUpperCase();
      const yesPrice = position.current_price ?? 0.5;
      const currentPriceForPrompt = normalizedSide === 'NO' ? (1 - yesPrice) : yesPrice;

      return {
        id: position.id,
        market_question: position.market_question,
        side: position.side,
        shares: position.shares,
        avg_entry_price: position.avg_entry_price,
        current_price: currentPriceForPrompt,
        current_value: position.current_value || 0,
        unrealized_pnl: position.unrealized_pnl || 0
      };
    }),
    markets,
    weekNumber
  );
}
