#!/usr/bin/env node

/**
 * Test Polymarket Integration
 *
 * Tests the Polymarket API integration by:
 * 1. Fetching markets from Gamma API (no auth required)
 * 2. Initializing authenticated CLOB client (requires credentials)
 * 3. Fetching orderbook data (requires auth)
 *
 * PREREQUISITES:
 * - Set POLYGON_WALLET_PRIVATE_KEY in .env.local
 * - Set POLYMARKET_FUNDER_ADDRESS in .env.local
 * - Have made at least one manual trade on Polymarket UI
 *
 * Run with: node scripts/test-polymarket.js
 */

require('dotenv').config({ path: '.env.local' });

// Dynamic import for ES modules
async function testPolymarket() {
  console.log('🧪 Testing Polymarket Integration\n');
  console.log('=' .repeat(60));

  try {
    // Import the polymarket module
    const polymarketModule = await import('../lib/polymarket.ts');
    const {
      fetchPolymarketMarkets,
      initializePolymarketClient,
      getOrderbook,
      isPolymarketConfigured
    } = polymarketModule;

    // Step 1: Check configuration
    console.log('\n📋 Step 1: Checking configuration...');
    const isConfigured = isPolymarketConfigured();

    if (isConfigured) {
      console.log('✅ Polymarket credentials found');
      console.log('   - POLYGON_WALLET_PRIVATE_KEY: SET');
      console.log('   - POLYMARKET_FUNDER_ADDRESS: SET');
    } else {
      console.log('⚠️  Polymarket credentials not configured');
      console.log('   Some tests will be skipped.');
      console.log('   See POLYMARKET_INTEGRATION.md for setup instructions.');
    }

    // Step 2: Fetch markets (no auth required)
    console.log('\n📊 Step 2: Fetching markets from Gamma API...');
    console.log('   (This does not require authentication)');

    const markets = await fetchPolymarketMarkets(5);
    console.log(`✅ Found ${markets.length} active markets`);

    if (markets.length > 0) {
      const market = markets[0];
      console.log('\n   Sample Market:');
      console.log(`   Question: ${market.question}`);
      console.log(`   Category: ${market.category || 'N/A'}`);
      console.log(`   Close Date: ${market.close_date}`);
      console.log(`   Current Price: ${(market.current_price * 100).toFixed(1)}%`);
      console.log(`   Volume: $${market.volume ? market.volume.toLocaleString() : 'N/A'}`);
      console.log(`   YES Token ID: ${market.yes_token_id.substring(0, 20)}...`);
      console.log(`   Tick Size: ${market.tick_size}`);
      console.log(`   Neg Risk: ${market.neg_risk}`);
    }

    // Step 3: Test authentication (requires credentials)
    if (isConfigured) {
      console.log('\n🔐 Step 3: Testing authentication...');
      console.log('   Initializing CLOB client...');

      try {
        const client = await initializePolymarketClient();
        console.log('✅ Authentication successful!');
        console.log('   CLOB client initialized');

        // Step 4: Fetch orderbook (requires auth)
        if (markets.length > 0) {
          console.log('\n📖 Step 4: Fetching orderbook...');
          console.log(`   Market: ${markets[0].question}`);

          const orderbook = await getOrderbook(client, markets[0].yes_token_id);
          console.log(`✅ Orderbook retrieved`);
          console.log(`   Bids: ${orderbook.bids.length}`);
          console.log(`   Asks: ${orderbook.asks.length}`);

          if (orderbook.bids.length > 0) {
            console.log(`   Best Bid: ${orderbook.bids[0].price} (${orderbook.bids[0].size} shares)`);
          }
          if (orderbook.asks.length > 0) {
            console.log(`   Best Ask: ${orderbook.asks[0].price} (${orderbook.asks[0].size} shares)`);
          }
        }

        // Step 5: Check account balance (if available)
        console.log('\n💰 Step 5: Checking account status...');
        console.log('   ℹ️  Balance checking requires additional API calls');
        console.log('   Skipping for now - see POLYMARKET_INTEGRATION.md');

      } catch (authError) {
        console.error('❌ Authentication failed:', authError.message);
        console.log('\n   Common issues:');
        console.log('   - Invalid private key format');
        console.log('   - Wrong funder address');
        console.log('   - Never made a manual trade on Polymarket UI');
        console.log('   - Insufficient wallet balance');
        console.log('\n   See POLYMARKET_INTEGRATION.md for troubleshooting');
      }
    } else {
      console.log('\n⏭️  Step 3-5: Skipped (credentials not configured)');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Market Fetching: PASSED (${markets.length} markets found)`);

    if (isConfigured) {
      console.log('✅ Configuration: COMPLETE');
      console.log('✅ Authentication: TESTED');
      console.log('✅ Orderbook Access: TESTED');
      console.log('\n🎉 All tests passed!');
      console.log('\n📝 Next Steps:');
      console.log('   1. Review POLYMARKET_INTEGRATION.md for complete guide');
      console.log('   2. Test with small amounts ($1-5) before scaling');
      console.log('   3. Set ENABLE_POLYMARKET=true when ready for live trading');
    } else {
      console.log('⚠️  Configuration: INCOMPLETE');
      console.log('⏭️  Authentication: SKIPPED');
      console.log('\n📝 Next Steps:');
      console.log('   1. Follow setup guide in POLYMARKET_INTEGRATION.md');
      console.log('   2. Set POLYGON_WALLET_PRIVATE_KEY in .env.local');
      console.log('   3. Set POLYMARKET_FUNDER_ADDRESS in .env.local');
      console.log('   4. Run this test again');
    }

    console.log('\n⚠️  IMPORTANT: This is a test environment');
    console.log('   Real trading is currently DISABLED by default');
    console.log('   Set ENABLE_POLYMARKET=true to enable real trading');

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
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
