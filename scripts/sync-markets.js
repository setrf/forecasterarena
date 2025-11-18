#!/usr/bin/env node

/**
 * Sync Markets from Polymarket
 *
 * Fetches real prediction markets from Polymarket and adds them to the database.
 * This can be run manually or via cron job.
 *
 * Run with: node scripts/sync-markets.js
 * Or: npm run sync-markets
 */

require('dotenv').config({ path: '.env.local' });

async function syncMarkets() {
  console.log('🔄 Syncing markets from Polymarket...\n');

  try {
    // Import the polymarket and database modules
    const polymarketModule = await import('../lib/polymarket.ts');
    const databaseModule = await import('../lib/database.ts');

    const { fetchAllPolymarketMarkets } = polymarketModule;
    const db = databaseModule.default;
    const { generateId } = databaseModule;

    // Fetch ALL markets from Polymarket using pagination
    // This will automatically loop through all pages of results
    const markets = await fetchAllPolymarketMarkets();
    console.log();

    if (markets.length === 0) {
      console.log('⚠️  No markets found. This might be a network issue.');
      return;
    }

    let newMarkets = 0;
    let updatedMarkets = 0;

    for (const market of markets) {
      // Check if market already exists
      const existing = db
        .prepare('SELECT id FROM markets WHERE polymarket_id = ?')
        .get(market.polymarket_id);

      if (existing) {
        // Update existing market
        db.prepare(`
          UPDATE markets
          SET
            current_price = ?,
            volume = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE polymarket_id = ?
        `).run(
          market.current_price,
          market.volume,
          market.status,
          market.polymarket_id
        );
        updatedMarkets++;
      } else {
        // Insert new market
        const marketId = `market-${generateId()}`;
        db.prepare(`
          INSERT INTO markets (
            id, polymarket_id, question, description, category,
            close_date, status, current_price, volume
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          marketId,
          market.polymarket_id,
          market.question,
          market.description,
          market.category,
          market.close_date,
          market.status,
          market.current_price,
          market.volume
        );
        newMarkets++;

        // Show first few new markets
        if (newMarkets <= 3) {
          console.log(`  ✓ Added: ${market.question.substring(0, 80)}${market.question.length > 80 ? '...' : ''}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ New markets: ${newMarkets}`);
    console.log(`🔄 Updated markets: ${updatedMarkets}`);
    console.log(`📈 Total markets in database: ${newMarkets + updatedMarkets}`);
    console.log('='.repeat(60));

    // Show total markets in database
    const totalMarkets = db.prepare('SELECT COUNT(*) as count FROM markets').get();
    console.log(`\n💾 Total markets in database: ${totalMarkets.count}`);

    // Show breakdown by status
    const activeCount = db.prepare("SELECT COUNT(*) as count FROM markets WHERE status = 'active'").get();
    const closedCount = db.prepare("SELECT COUNT(*) as count FROM markets WHERE status = 'closed'").get();
    const resolvedCount = db.prepare("SELECT COUNT(*) as count FROM markets WHERE status = 'resolved'").get();

    console.log(`   Active: ${activeCount.count}`);
    console.log(`   Closed: ${closedCount.count}`);
    console.log(`   Resolved: ${resolvedCount.count}`);

    console.log('\n✅ Markets synced successfully!');
    console.log('   Visit http://localhost:3000/markets to see all markets\n');

  } catch (error) {
    console.error('\n❌ ERROR syncing markets:');
    console.error(error.message);

    if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND')) {
      console.error('\nℹ️  This appears to be a network connectivity issue.');
      console.error('   Make sure you have internet access and try again.');
    }

    process.exit(1);
  }
}

// Run the sync
syncMarkets().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
