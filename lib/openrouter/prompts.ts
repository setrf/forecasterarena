/**
 * LLM Prompt Templates
 * 
 * This module contains all prompts used for LLM decision-making.
 * Prompts are designed for maximum clarity and reproducibility.
 * 
 * @module openrouter/prompts
 */

import type { Agent, Market, Position } from '../types';
import { INITIAL_BALANCE, MIN_BET, MAX_BET_PERCENT, METHODOLOGY_VERSION } from '../constants';

/**
 * System prompt for all LLM decisions
 * 
 * This prompt establishes the LLM's role and decision format.
 * It is identical for all models to ensure fair comparison.
 */
export const SYSTEM_PROMPT = `You are an AI forecaster participating in Forecaster Arena (${METHODOLOGY_VERSION}), a benchmark that tests AI prediction capabilities on real-world events using Polymarket prediction markets.

YOUR OBJECTIVE:
Maximize your forecasting accuracy and portfolio returns by making intelligent bets on prediction markets.

DECISION FORMAT:
You must respond with valid JSON in exactly one of these formats:

FOR PLACING BETS:
{
  "action": "BET",
  "bets": [
    {
      "market_id": "uuid",
      "side": "YES" or "NO" (for binary markets) OR outcome name (for multi-outcome markets),
      "amount": 500.00
    }
  ],
  "reasoning": "Your detailed reasoning"
}

MARKET TYPES:
- Binary markets: Use "YES" or "NO" as the side
- Multi-outcome markets: Use the exact outcome name as the side (e.g., "Trump", "Harris", "Other")
  Multi-outcome markets show outcomes and prices like: Outcomes: ["Trump", "Harris"] Prices: {"Trump": 0.55, "Harris": 0.45}

FOR SELLING POSITIONS:
{
  "action": "SELL",
  "sells": [
    {
      "position_id": "uuid",
      "percentage": 100
    }
  ],
  "reasoning": "Your detailed reasoning"
}

FOR HOLDING:
{
  "action": "HOLD",
  "reasoning": "Your detailed reasoning"
}

RULES:
1. Minimum bet: $${MIN_BET}
2. Maximum bet: ${MAX_BET_PERCENT * 100}% of your current cash balance
3. One position per market per side
4. You can make multiple bets/sells in one decision
5. Bet size reflects confidence: larger bet = higher implied confidence

SCORING:
- Brier Score: Measures forecast accuracy (lower is better)
- Implied confidence = bet_amount / max_possible_bet
- A max bet (${MAX_BET_PERCENT * 100}% of balance) = 100% confidence
- Portfolio P/L also tracked

RESPOND WITH VALID JSON ONLY. No markdown, no explanation outside the JSON.`;

/**
 * Position summary with market info for the prompt
 */
interface PositionForPrompt {
  id: string;
  market_question: string;
  side: string;
  shares: number;
  avg_entry_price: number;
  current_price: number;
  current_value: number;
  unrealized_pnl: number;
}

/**
 * Build the user prompt with portfolio state and market data
 * 
 * @param agent - Current agent state
 * @param positions - Open positions with market info
 * @param markets - Available markets to bet on
 * @param cohortWeek - Current week number in the cohort
 * @returns User prompt string
 */
export function buildUserPrompt(
  agent: Agent,
  positions: PositionForPrompt[],
  markets: Market[],
  cohortWeek: number
): string {
  const maxBet = agent.cash_balance * MAX_BET_PERCENT;
  const positionsValue = positions.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalValue = agent.cash_balance + positionsValue;
  const pnl = totalValue - INITIAL_BALANCE;
  const pnlPercent = ((pnl / INITIAL_BALANCE) * 100).toFixed(2);

  let prompt = `CURRENT DATE: ${new Date().toISOString().split('T')[0]}
DECISION WEEK: ${cohortWeek}

YOUR PORTFOLIO:
- Cash Balance: $${agent.cash_balance.toFixed(2)}
- Maximum Bet Size: $${maxBet.toFixed(2)} (${MAX_BET_PERCENT * 100}% of cash)
- Positions Value: $${positionsValue.toFixed(2)}
- Total Portfolio: $${totalValue.toFixed(2)}
- P/L: $${pnl.toFixed(2)} (${pnl >= 0 ? '+' : ''}${pnlPercent}%)

`;

  if (positions.length > 0) {
    prompt += `YOUR CURRENT POSITIONS:\n`;
    for (const pos of positions) {
      const pnlPos = (pos.current_value || 0) - (pos.shares * pos.avg_entry_price);
      prompt += `- ID: ${pos.id}
  Market: "${pos.market_question}"
  Side: ${pos.side} | Shares: ${pos.shares.toFixed(2)}
  Entry: ${(pos.avg_entry_price * 100).toFixed(1)}% | Current: ${(pos.current_price * 100).toFixed(1)}%
  Value: $${(pos.current_value || 0).toFixed(2)} | P/L: $${pnlPos.toFixed(2)}

`;
    }
  } else {
    prompt += `YOUR CURRENT POSITIONS: None\n\n`;
  }

  prompt += `AVAILABLE MARKETS (Top ${markets.length} by volume):\n`;

  for (const market of markets) {
    const isBinary = market.market_type === 'binary' || !market.current_prices;

    prompt += `- ID: ${market.id}
  Question: "${market.question}"
  Category: ${market.category || 'General'}
  Type: ${isBinary ? 'Binary (YES/NO)' : 'Multi-outcome'}
`;

    if (isBinary) {
      const yesPrice = market.current_price || 0.5;
      const noPrice = 1 - yesPrice;
      prompt += `  Prices: ${(yesPrice * 100).toFixed(1)}% YES / ${(noPrice * 100).toFixed(1)}% NO\n`;
    } else {
      // Multi-outcome market
      try {
        const outcomes = market.outcomes ? JSON.parse(market.outcomes) : [];
        const prices = market.current_prices ? JSON.parse(market.current_prices) : {};
        prompt += `  Outcomes: ${JSON.stringify(outcomes)}\n`;
        prompt += `  Prices: ${JSON.stringify(prices)}\n`;
      } catch {
        prompt += `  Prices: (unavailable)\n`;
      }
    }

    prompt += `  Volume: $${market.volume?.toLocaleString() || 'N/A'}
  Closes: ${market.close_date.split('T')[0]}

`;
  }

  prompt += `\nWhat is your decision? Respond with valid JSON only.`;

  return prompt;
}

/**
 * Build retry prompt for malformed responses
 * 
 * @param originalPrompt - The original user prompt
 * @param previousResponse - The malformed response
 * @param error - Error message from parsing
 * @returns Modified prompt for retry
 */
export function buildRetryPrompt(
  originalPrompt: string,
  previousResponse: string,
  error: string
): string {
  return `${originalPrompt}

---
PREVIOUS RESPONSE WAS INVALID:
Error: ${error}

Your response: ${previousResponse.slice(0, 500)}${previousResponse.length > 500 ? '...' : ''}

Please respond with VALID JSON only. No markdown code blocks, no explanation text - just the JSON object.`;
}

/**
 * Get short model name for display
 * 
 * @param modelId - Full model ID
 * @returns Short display name
 */
export function getShortModelName(modelId: string): string {
  const parts = modelId.split('/');
  return parts[parts.length - 1];
}



