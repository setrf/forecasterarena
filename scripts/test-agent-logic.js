#!/usr/bin/env node

/**
 * Test the complete agent decision-making logic
 * This simulates what happens in the cron job
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY environment variable is not set');
  console.error('👉 Set it: export OPENROUTER_API_KEY=sk-or-v1-...');
  process.exit(1);
}

// Mock agent data
const mockAgent = {
  id: 'test-agent-1',
  display_name: 'GPT-4 Test',
  model_id: 'openai/gpt-4',
  balance: 1000.00,
  total_bets: 0
};

// Mock market data
const mockMarkets = [
  {
    id: 'market-1',
    question: 'Will Bitcoin reach $100,000 by end of 2024?',
    category: 'crypto',
    current_price: 0.45,
    close_date: '2024-12-31T23:59:59Z'
  },
  {
    id: 'market-2',
    question: 'Will AI achieve AGI in 2025?',
    category: 'technology',
    current_price: 0.15,
    close_date: '2025-12-31T23:59:59Z'
  }
];

// Build the system prompt (from lib/openrouter.ts)
function buildSystemPrompt(agentName) {
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

// Build the user prompt
function buildUserPrompt(balance, totalBets, markets) {
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

// Call OpenRouter API
async function callLLM(modelId, systemPrompt, userPrompt) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Forecaster Arena Test',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 500,
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error ${response.status}: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return {
      decision: JSON.parse(content),
      usage: data.usage,
      model: data.model
    };
  } catch (error) {
    throw new Error(`Failed to call LLM: ${error.message}`);
  }
}

// Main test function
async function testAgentLogic() {
  console.log('🧪 Testing Forecaster Arena Agent Logic');
  console.log('==========================================\n');

  console.log('📊 Mock Agent:', mockAgent.display_name);
  console.log('💰 Balance: $' + mockAgent.balance.toFixed(2));
  console.log('📈 Markets available:', mockMarkets.length);
  console.log('');

  console.log('🤖 Sending to OpenRouter...');
  console.log('Model:', mockAgent.model_id);
  console.log('');

  try {
    const systemPrompt = buildSystemPrompt(mockAgent.display_name);
    const userPrompt = buildUserPrompt(mockAgent.balance, mockAgent.total_bets, mockMarkets);

    const result = await callLLM(mockAgent.model_id, systemPrompt, userPrompt);

    console.log('✅ Response received!');
    console.log('==========================================\n');

    console.log('📝 DECISION:');
    console.log(JSON.stringify(result.decision, null, 2));
    console.log('');

    console.log('📊 API USAGE:');
    console.log('- Prompt tokens:', result.usage.prompt_tokens);
    console.log('- Completion tokens:', result.usage.completion_tokens);
    console.log('- Total tokens:', result.usage.total_tokens);
    console.log('- Model used:', result.model);
    console.log('- Estimated cost: ~$' + ((result.usage.total_tokens / 1000) * 0.03).toFixed(4));
    console.log('');

    // Validate decision
    console.log('🔍 VALIDATION:');

    if (result.decision.action === 'BET') {
      const issues = [];

      if (!result.decision.marketId) issues.push('Missing marketId');
      if (!result.decision.side) issues.push('Missing side');
      if (!result.decision.amount) issues.push('Missing amount');
      if (result.decision.confidence === undefined) issues.push('Missing confidence');
      if (!result.decision.reasoning) issues.push('Missing reasoning');

      if (result.decision.amount > mockAgent.balance) {
        issues.push(`Amount ($${result.decision.amount}) exceeds balance ($${mockAgent.balance})`);
      }

      if (result.decision.amount > mockAgent.balance * 0.3) {
        issues.push(`Amount ($${result.decision.amount}) exceeds 30% risk limit ($${mockAgent.balance * 0.3})`);
      }

      if (issues.length > 0) {
        console.log('❌ Invalid BET decision:');
        issues.forEach(i => console.log('  -', i));
      } else {
        console.log('✅ Valid BET decision');
        console.log(`  - Market: ${mockMarkets.find(m => m.id === result.decision.marketId)?.question || 'Unknown'}`);
        console.log(`  - Side: ${result.decision.side}`);
        console.log(`  - Amount: $${result.decision.amount}`);
        console.log(`  - Confidence: ${(result.decision.confidence * 100).toFixed(0)}%`);
        console.log(`  - Reasoning: ${result.decision.reasoning}`);
      }
    } else if (result.decision.action === 'HOLD') {
      console.log('✅ Agent decided to HOLD');
      console.log(`  - Reasoning: ${result.decision.reasoning}`);
    } else {
      console.log('❌ Invalid action:', result.decision.action);
    }

    console.log('');
    console.log('==========================================');
    console.log('✅ Test completed successfully!');
    console.log('');
    console.log('This is exactly what happens every 3 minutes in production.');
    console.log('Each of the 6 agents would go through this same process.');

  } catch (error) {
    console.error('');
    console.error('❌ Test failed:', error.message);
    console.error('');
    process.exit(1);
  }
}

// Run the test
testAgentLogic();
