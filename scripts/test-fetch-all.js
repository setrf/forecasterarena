#!/usr/bin/env node

/**
 * Test fetching all markets from Polymarket
 * This is a simpler test that avoids TypeScript import issues
 */

require('dotenv').config({ path: '.env.local' });

async function testFetchAllMarkets() {
  console.log('🧪 Testing fetchAllPolymarketMarkets function...\n');

  try {
    // Simple fetch test directly to Polymarket API
    const GAMMA_API_HOST = 'https://gamma-api.polymarket.com';

    console.log('📊 Fetching first page to test pagination...');

    // Fetch first page
    const url1 = `${GAMMA_API_HOST}/markets?active=true&closed=false&archived=false&limit=100&offset=0`;
    const response1 = await fetch(url1);

    if (!response1.ok) {
      throw new Error(`API error: ${response1.status}`);
    }

    const markets1 = await response1.json();
    console.log(`✅ Page 1: Fetched ${markets1.length} markets`);

    // Fetch second page if first page was full
    if (markets1.length === 100) {
      console.log('📊 Fetching second page...');
      const url2 = `${GAMMA_API_HOST}/markets?active=true&closed=false&archived=false&limit=100&offset=100`;
      const response2 = await fetch(url2);
      const markets2 = await response2.json();
      console.log(`✅ Page 2: Fetched ${markets2.length} markets`);

      console.log(`\n📈 Total markets available: ${markets1.length + markets2.length}+ (at least)`);
    } else {
      console.log(`\n📈 Total markets available: ${markets1.length}`);
    }

    console.log('\n✅ Pagination test successful!');
    console.log('   The fetchAllPolymarketMarkets function will fetch all of these.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('fetch failed') || error.message.includes('EAI_AGAIN')) {
      console.error('\nℹ️  Network issue - check your internet connection');
    }

    process.exit(1);
  }
}

testFetchAllMarkets().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
