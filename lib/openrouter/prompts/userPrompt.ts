import { INITIAL_BALANCE, MAX_BET_PERCENT } from '@/lib/constants';
import type {
  PositionForPrompt
} from '@/lib/openrouter/prompts/types';
import type { Agent, Market } from '@/lib/types';

function buildPositionsSection(positions: PositionForPrompt[]): string {
  if (positions.length === 0) {
    return 'YOUR CURRENT POSITIONS: None\n\n';
  }

  let section = 'YOUR CURRENT POSITIONS:\n';
  for (const position of positions) {
    const pnl = (position.current_value || 0) - (position.shares * position.avg_entry_price);
    section += `- ID: ${position.id}
  Market: "${position.market_question}"
  Side: ${position.side} | Shares: ${position.shares.toFixed(2)}
  Entry: ${(position.avg_entry_price * 100).toFixed(1)}% | Current: ${(position.current_price * 100).toFixed(1)}%
  Value: $${(position.current_value || 0).toFixed(2)} | P/L: $${pnl.toFixed(2)}

`;
  }

  return section;
}

function buildMarketSection(markets: Market[]): string {
  let section = `AVAILABLE MARKETS (Top ${markets.length} by volume):\n`;

  for (const market of markets) {
    const isBinary = market.market_type === 'binary' || !market.current_prices;

    section += `- ID: ${market.id}
  Question: "${market.question}"
  Category: ${market.category || 'General'}
  Type: ${isBinary ? 'Binary (YES/NO)' : 'Multi-outcome'}
`;

    if (isBinary) {
      const yesPrice = market.current_price ?? 0.5;
      const noPrice = 1 - yesPrice;
      section += `  Prices: ${(yesPrice * 100).toFixed(1)}% YES / ${(noPrice * 100).toFixed(1)}% NO\n`;
    } else {
      try {
        const outcomes = market.outcomes ? JSON.parse(market.outcomes) : [];
        const prices = market.current_prices ? JSON.parse(market.current_prices) : {};
        section += `  Outcomes: ${JSON.stringify(outcomes)}\n`;
        section += `  Prices: ${JSON.stringify(prices)}\n`;
      } catch {
        section += '  Prices: (unavailable)\n';
      }
    }

    section += `  Volume: $${market.volume?.toLocaleString() || 'N/A'}
  Closes: ${market.close_date.split('T')[0]}

`;
  }

  return section;
}

export function buildUserPrompt(
  agent: Agent,
  positions: PositionForPrompt[],
  markets: Market[],
  cohortWeek: number
): string {
  const maxBet = agent.cash_balance * MAX_BET_PERCENT;
  const positionsValue = positions.reduce((sum, position) => sum + (position.current_value || 0), 0);
  const totalValue = agent.cash_balance + positionsValue;
  const pnl = totalValue - INITIAL_BALANCE;
  const pnlPercent = ((pnl / INITIAL_BALANCE) * 100).toFixed(2);

  let prompt = `CURRENT DATE: ${new Date().toISOString().split('T')[0]}
DECISION WEEK: ${cohortWeek}

YOUR PORTFOLIO:
- Cash Balance: $${agent.cash_balance.toFixed(2)}
- Maximum Total BET Allocation This Decision: $${maxBet.toFixed(2)} (${MAX_BET_PERCENT * 100}% of cash across all bets)
- Positions Value: $${positionsValue.toFixed(2)}
- Total Portfolio: $${totalValue.toFixed(2)}
- P/L: $${pnl.toFixed(2)} (${pnl >= 0 ? '+' : ''}${pnlPercent}%)

`;

  prompt += buildPositionsSection(positions);
  prompt += buildMarketSection(markets);
  prompt += '\nWhat is your decision? Respond with valid JSON only.';

  return prompt;
}
