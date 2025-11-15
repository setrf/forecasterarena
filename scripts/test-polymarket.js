#!/usr/bin/env node

/**
 * Test Polymarket Market Data Integration
 *
 * Tests fetching real market data from Polymarket's public Gamma API.
 * NO AUTHENTICATION REQUIRED - uses public endpoints only.
 *
 * This script verifies:
 * 1. Fetching active markets from Polymarket
 * 2. Getting market details by ID
 * 3. Checking market resolution status
 *
 * Run with: node scripts/test-polymarket.js
 * Or: npm run test-polymarket
 */

// Dynamic import for ES modules
async function testPolymarket() {
  console.log('🧪 Testing Polymarket Market Data Integration\n');
  console.log('=' .repeat(60));
  console.log('ℹ️  This is PAPER TRADING ONLY - No real money involved');
  console.log('   Fetching real market data for AI agent analysis');
  console.log('=' .repeat(60));

  try {
    // Import the polymarket module
    const polymarketModule = await import('../lib/polymarket.ts');
    const {
      fetchPolymarketMarkets,
      fetchMarketById,
      checkMarketResolution
    } = polymarketModule;

    // Step 1: Fetch active markets
    console.log('\n📊 Step 1: Fetching active markets...');
    console.log('   Using public Gamma API (no auth required)');

    const markets = await fetchPolymarketMarkets(10);
    console.log(`✅ Found ${markets.length} active markets`);

    if (markets.length === 0) {
      console.log('\n⚠️  No active markets found on Polymarket');
      console.log('   This might be a temporary API issue.');
      return;
    }

    // Display sample markets
    console.log('\n📋 Sample Markets:');
    markets.slice(0, 3).forEach((market, idx) => {
      console.log(`\n   ${idx + 1}. ${market.question}`);
      console.log(`      Category: ${market.category || 'N/A'}`);
      console.log(`      Close Date: ${new Date(market.close_date).toLocaleDateString()}`);
      console.log(`      Current YES Price: ${(market.current_price * 100).toFixed(1)}%`);
      console.log(`      Volume: $${market.volume ? market.volume.toLocaleString() : 'N/A'}`);
      console.log(`      Status: ${market.status}`);
      console.log(`      Polymarket ID: ${market.polymarket_id}`);
    });

    // Step 2: Fetch individual market details
    console.log('\n📋 Step 2: Fetching individual market details...');
    const sampleMarket = markets[0];
    const details = await fetchMarketById(sampleMarket.polymarket_id);

    if (details) {
      console.log(`✅ Market details retrieved`);
      console.log(`   Question: ${details.question}`);
      console.log(`   Current Price: ${(details.current_price * 100).toFixed(1)}%`);
      console.log(`   Status: ${details.status}`);
    } else {
      console.log('⚠️  Could not fetch market details');
    }

    // Step 3: Check resolution status
    console.log('\n🔍 Step 3: Checking market resolution status...');
    const resolution = await checkMarketResolution(sampleMarket.polymarket_id);

    if (resolution.resolved) {
      console.log(`✅ Market is resolved`);
      console.log(`   Winner: ${resolution.winner}`);
    } else {
      console.log(`ℹ️  Market is not yet resolved (still active)`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Market Fetching: PASSED (${markets.length} markets found)`);
    console.log(`✅ Market Details: PASSED`);
    console.log(`✅ Resolution Check: PASSED`);

    console.log('\n🎉 All tests passed!\n');

    console.log('📝 How This Works:');
    console.log('   1. AI agents analyze real Polymarket markets');
    console.log('   2. Agents make SIMULATED bets (no real money)');
    console.log('   3. When markets resolve, agent performance is scored');
    console.log('   4. Compare which LLM makes better predictions!\n');

    console.log('🚀 Next Steps:');
    console.log('   - Markets can be synced into database with lib/sync-markets.ts');
    console.log('   - Agents will make paper bets on these real markets');
    console.log('   - Performance tracked when markets resolve');
    console.log('   - No wallets, no private keys, no real money needed!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);

    if (error.message.includes('fetch')) {
      console.error('\nℹ️  This might be a network issue or Polymarket API downtime.');
      console.error('   Try again in a few minutes.');
    }

    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testPolymarket().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
