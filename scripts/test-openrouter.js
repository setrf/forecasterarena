#!/usr/bin/env node

/**
 * Quick test script to verify OpenRouter API key works
 * Run with: node scripts/test-openrouter.js
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY environment variable is not set');
  console.error('👉 Add it to your .env.local file');
  process.exit(1);
}

async function testOpenRouter() {
  console.log('🧪 Testing OpenRouter API connection...\n');

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Forecaster Arena Test',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello from Forecaster Arena!" and nothing else.'
          }
        ],
        max_tokens: 20
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ OpenRouter API Error:', response.status);
      console.error('Response:', error);
      return false;
    }

    const data = await response.json();
    const message = data.choices[0].message.content;

    console.log('✅ OpenRouter API is working!');
    console.log('📨 Response from GPT-4:', message);
    console.log('\n💰 Cost for this test:', data.usage ?
      `~$${((data.usage.total_tokens / 1000) * 0.03).toFixed(4)}` :
      'Unknown');

    return true;
  } catch (error) {
    console.error('❌ Error testing OpenRouter:', error.message);
    return false;
  }
}

testOpenRouter();
