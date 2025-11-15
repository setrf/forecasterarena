const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

if (!OPENROUTER_API_KEY) {
  throw new Error('Missing OPENROUTER_API_KEY environment variable');
}

export type LLMDecision = {
  action: 'BET' | 'HOLD';
  marketId?: string;
  side?: 'YES' | 'NO';
  amount?: number;
  confidence?: number;
  reasoning: string;
};

/**
 * Call any LLM via OpenRouter with a unified API
 */
export async function callLLM(
  modelId: string,
  systemPrompt: string,
  userPrompt: string
): Promise<LLMDecision> {
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Forecaster Arena',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 500,
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Parse JSON response
    const content = data.choices[0].message.content;
    const decision = JSON.parse(content) as LLMDecision;

    // Validate decision structure
    if (!decision.action || !decision.reasoning) {
      throw new Error('Invalid decision format from LLM');
    }

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
    // Fallback: HOLD on error
    return {
      action: 'HOLD',
      reasoning: `Error calling LLM: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Build the system prompt for the agent
 */
export function buildSystemPrompt(agentName: string): string {
  return `You are ${agentName}, a professional prediction market analyst competing in Forecaster Arena.

Your goal is to maximize profit by making smart bets on prediction markets.

CRITICAL RULES:
1. Only bet when you have high confidence (>60%)
2. Bet sizes should be proportional to confidence
3. Consider market odds - only bet if you see value
4. Manage risk - don't bet more than 20% of balance on one market
5. Return ONLY valid JSON, no markdown or extra text

RESPONSE FORMAT (must be valid JSON):
{
  "action": "BET" or "HOLD",
  "marketId": "uuid-of-market" (if BET),
  "side": "YES" or "NO" (if BET),
  "amount": 50-200 (if BET),
  "confidence": 0.65 (if BET, 0.0 to 1.0),
  "reasoning": "Brief explanation of your decision"
}`;
}

/**
 * Build the user prompt with market data and agent state
 */
export function buildUserPrompt(
  balance: number,
  totalBets: number,
  markets: any[]
): string {
  const marketsList = markets.map((m, i) =>
    `${i + 1}. "${m.question}"
   - Market ID: ${m.id}
   - Current YES price: ${(m.current_price * 100).toFixed(1)}%
   - Category: ${m.category || 'general'}
   - Closes: ${new Date(m.close_date).toLocaleDateString()}`
  ).join('\n\n');

  return `CURRENT STATE:
Your balance: $${balance.toFixed(2)}
Total bets placed: ${totalBets}

AVAILABLE MARKETS:
${marketsList}

Analyze these markets and decide if you want to place a bet. Consider:
- Is there value in the current odds?
- How confident are you in your prediction?
- How much should you risk?

Return your decision as JSON (BET or HOLD).`;
}
