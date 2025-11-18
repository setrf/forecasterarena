/**
 * OpenRouter LLM Integration
 *
 * This module handles communication with OpenRouter API (https://openrouter.ai),
 * which provides unified access to all major LLM models through a single API.
 *
 * Benefits of using OpenRouter:
 * - Single API for all models (GPT-4, Claude, Gemini, etc.)
 * - No need to manage multiple API keys
 * - Consistent request/response format
 * - Automatic fallbacks and rate limiting
 * - Cost tracking across all models
 *
 * The module provides functions to:
 * - Call any LLM model with structured prompts
 * - Build system prompts for agent behavior
 * - Build user prompts with market data
 * - Parse and validate LLM decisions
 */

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Validate API key is present
if (!OPENROUTER_API_KEY) {
  throw new Error('Missing OPENROUTER_API_KEY environment variable');
}

/**
 * LLM Decision Type
 *
 * Represents a decision made by an AI agent.
 * The LLM must return JSON in this exact format.
 */
export type LLMDecision = {
  action: 'BET' | 'SELL' | 'HOLD'; // Action to take: place bet, sell existing bets, or wait
  betsToSell?: string[];           // Array of bet IDs to sell (required if action=SELL)
  marketId?: string;               // Which market to bet on (required if action=BET)
  side?: 'YES' | 'NO';             // Which side to bet on (required if action=BET)
  amount?: number;                 // Bet amount in dollars (required if action=BET)
  confidence?: number;             // Confidence level 0-1 (required if action=BET)
  reasoning: string;               // Explanation of the decision (always required)
};

/**
 * Call any LLM via OpenRouter with a unified API
 *
 * Makes a request to OpenRouter API to get a trading decision from an AI model.
 * Handles errors gracefully by returning a HOLD decision on failure.
 *
 * @param modelId - OpenRouter model ID (e.g., 'openai/gpt-4', 'anthropic/claude-3.5-sonnet')
 * @param systemPrompt - System prompt defining agent behavior and rules
 * @param userPrompt - User prompt with current market data and agent state
 * @returns LLM decision object (BET or HOLD)
 *
 * @example
 * const decision = await callLLM(
 *   'openai/gpt-4',
 *   buildSystemPrompt('GPT-4'),
 *   buildUserPrompt(1000, 5, markets)
 * );
 */
export async function callLLM(
  modelId: string,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMDecision> {
  try {
    // Make request to OpenRouter API
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        // Optional: helps with rate limiting and analytics
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Forecaster Arena',
      },
      body: JSON.stringify({
        model: modelId,                                    // Which model to use
        messages: [
          {
            role: 'system',                                // System prompt defines behavior
            content: systemPrompt
          },
          {
            role: 'user',                                  // User prompt has the task
            content: userPrompt
          }
        ],
        response_format: { type: 'json_object' },          // Force JSON response
        temperature: 0.7,                                  // Balanced creativity/consistency
        max_tokens: 500,                                   // Limit response length
      })
    });

    // Check for HTTP errors
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Parse the JSON response from the LLM
    const content = data.choices[0].message.content;
    const decision = JSON.parse(content) as LLMDecision;

    // Validate decision has required fields
    if (!decision.action || !decision.reasoning) {
      throw new Error('Invalid decision format from LLM');
    }

    // Validate BET decisions have all required parameters
    if (decision.action === 'BET') {
      if (!decision.marketId || !decision.side || !decision.amount || decision.confidence === undefined) {
        console.warn('Invalid BET decision, defaulting to HOLD:', decision);
        return {
          action: 'HOLD',
          reasoning: 'Invalid BET parameters, skipping'
        };
      }
    }

    return decision;
  } catch (error) {
    console.error(`Error calling LLM ${modelId}:`, error);
    // Fallback: Return HOLD decision on any error
    // This prevents the agent from crashing the cron job
    return {
      action: 'HOLD',
      reasoning: `Error calling LLM: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Build the system prompt for an AI agent
 *
 * The system prompt defines the agent's:
 * - Role and identity
 * - Goals and objectives
 * - Trading rules and constraints
 * - Response format requirements
 *
 * This prompt is crucial for getting consistent, high-quality decisions.
 *
 * @param agentName - Display name of the agent (e.g., "GPT-4")
 * @returns System prompt string
 */
export function buildSystemPrompt(agentName: string): string {
  return `You are ${agentName}, a professional prediction market analyst competing in Forecaster Arena.

Your goal is to maximize profit by making smart bets on prediction markets.

CRITICAL RULES:
1. Review your existing bets first - sell if market moved against you or you want to take profits
2. Only place new bets when you have high confidence (>60%)
3. Bet sizes should be proportional to confidence
4. Consider market odds - only bet if you see value
5. Manage risk - don't bet more than 20% of balance on one market
6. Return ONLY valid JSON, no markdown or extra text

ACTIONS:
- SELL: Sell one or more existing bets to realize P/L and free up cash
- BET: Place a new bet on a market
- HOLD: Don't make any changes this week

RESPONSE FORMAT (must be valid JSON):
{
  "action": "SELL" or "BET" or "HOLD",
  "betsToSell": ["bet-id-1", "bet-id-2"] (if SELL - array of bet IDs),
  "marketId": "uuid-of-market" (if BET),
  "side": "YES" or "NO" (if BET),
  "amount": 50-200 (if BET),
  "confidence": 0.65 (if BET, 0.0 to 1.0),
  "reasoning": "Brief explanation of your decision"
}`;
}

/**
 * Build the user prompt with market data and agent state
 *
 * The user prompt provides the agent with:
 * - Current balance and betting history
 * - Existing pending bets with MTM values
 * - List of available markets with details
 * - Guidance on what to consider
 *
 * @param balance - Agent's current available balance
 * @param totalBets - Number of bets the agent has placed
 * @param markets - Array of available market objects
 * @param pendingBets - Array of agent's pending bets with MTM info
 * @returns User prompt string
 */
export function buildUserPrompt(
  balance: number,
  totalBets: number,
  markets: any[],
  pendingBets: any[] = []
): string {
  // Format existing bets with MTM information
  const betsList = pendingBets.length > 0
    ? pendingBets.map((b, i) => {
        const mtmPL = b.mtm_pnl || 0;
        const mtmPct = b.bet_amount ? (mtmPL / b.bet_amount * 100) : 0;
        return `${i + 1}. Bet ID: ${b.bet_id}
   - Market: "${b.market_question}"
   - Side: ${b.side} at ${(b.entry_price * 100).toFixed(1)}%
   - Amount: $${b.bet_amount.toFixed(2)}
   - Current price: ${(b.current_price * 100).toFixed(1)}%
   - Unrealized P/L: $${mtmPL.toFixed(2)} (${mtmPct > 0 ? '+' : ''}${mtmPct.toFixed(1)}%)`;
      }).join('\n\n')
    : 'None';

  // Format markets with all relevant information
  const marketsList = markets.map((m, i) =>
    `${i + 1}. "${m.question}"
   - Market ID: ${m.id}
   - Current YES price: ${(m.current_price * 100).toFixed(1)}%
   - Category: ${m.category || 'general'}
   - Closes: ${new Date(m.close_date).toLocaleDateString()}`
  ).join('\n\n');

  return `CURRENT STATE:
Your cash balance: $${balance.toFixed(2)}
Total bets placed (all time): ${totalBets}
Pending bets: ${pendingBets.length}

YOUR EXISTING BETS:
${betsList}

AVAILABLE MARKETS:
${marketsList}

Weekly Decision Time:
1. First, review your existing bets - sell any you want to exit (realize P/L and free up cash)
2. Then, consider placing new bets with your available cash

Return your decision as JSON (SELL, BET, or HOLD).`;
}
