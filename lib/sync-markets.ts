/**
 * Market Synchronization Module
 *
 * Syncs real prediction market data from Polymarket into our database.
 * Also checks for resolved markets and updates bet outcomes.
 */

import db from './database';
import { fetchPolymarketMarkets, fetchMarketById, checkMarketResolution } from './polymarket';
import { resolveMarket } from './agents-sqlite';

/**
 * Sync active markets from Polymarket into database
 *
 * Fetches current markets from Polymarket and adds new ones to the database.
 * Updates prices for existing markets.
 *
 * @param limit - Maximum number of markets to fetch (default: 50)
 * @returns Number of markets synced
 */
export async function syncMarketsFromPolymarket(limit: number = 50): Promise<number> {
  console.log('📊 Syncing markets from Polymarket...');

  try {
    const markets = await fetchPolymarketMarkets(limit);
    let newMarkets = 0;
    let updatedMarkets = 0;

    for (const market of markets) {
      // Check if market already exists
      const existing = db.prepare(
        'SELECT id FROM markets WHERE polymarket_id = ?'
      ).get(market.polymarket_id) as { id: string } | undefined;

      if (existing) {
        // Update existing market price
        db.prepare(`
          UPDATE markets
          SET current_price = ?, volume = ?, updated_at = CURRENT_TIMESTAMP
          WHERE polymarket_id = ?
        `).run(market.current_price, market.volume, market.polymarket_id);
        updatedMarkets++;
      } else {
        // Insert new market
        const marketId = `market-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      }
    }

    console.log(`✅ Market sync complete: ${newMarkets} new, ${updatedMarkets} updated`);
    return newMarkets + updatedMarkets;

  } catch (error) {
    console.error('❌ Error syncing markets:', error);
    throw error;
  }
}

/**
 * Check all active markets for resolutions
 *
 * Queries Polymarket for each active market to see if it has resolved.
 * If resolved, updates the market and settles all related bets.
 *
 * @returns Number of markets resolved
 */
export async function checkAndResolveMarkets(): Promise<number> {
  console.log('🔍 Checking for resolved markets...');

  try {
    // Get all active or closed markets that haven't been resolved yet
    const markets = db.prepare(`
      SELECT id, polymarket_id, question
      FROM markets
      WHERE status IN ('active', 'closed')
      AND polymarket_id IS NOT NULL
    `).all() as Array<{ id: string; polymarket_id: string; question: string }>;

    let resolvedCount = 0;

    for (const market of markets) {
      const resolution = await checkMarketResolution(market.polymarket_id);

      if (resolution.resolved && resolution.winner) {
        console.log(`✓ Market resolved: "${market.question}" → ${resolution.winner}`);

        // Resolve the market and settle all bets
        resolveMarket(market.id, resolution.winner);
        resolvedCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (resolvedCount > 0) {
      console.log(`✅ Resolved ${resolvedCount} market(s)`);
    } else {
      console.log('ℹ️  No markets resolved');
    }

    return resolvedCount;

  } catch (error) {
    console.error('❌ Error checking market resolutions:', error);
    throw error;
  }
}

/**
 * Update prices for all active markets
 *
 * Refreshes current prices from Polymarket for better decision-making.
 *
 * @returns Number of markets updated
 */
export async function updateMarketPrices(): Promise<number> {
  console.log('💰 Updating market prices...');

  try {
    const markets = db.prepare(`
      SELECT id, polymarket_id
      FROM markets
      WHERE status = 'active'
      AND polymarket_id IS NOT NULL
    `).all() as Array<{ id: string; polymarket_id: string }>;

    let updatedCount = 0;

    for (const market of markets) {
      const details = await fetchMarketById(market.polymarket_id);

      if (details) {
        db.prepare(`
          UPDATE markets
          SET
            current_price = ?,
            volume = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          details.current_price,
          details.volume,
          details.status,
          market.id
        );
        updatedCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Updated ${updatedCount} market prices`);
    return updatedCount;

  } catch (error) {
    console.error('❌ Error updating prices:', error);
    throw error;
  }
}

/**
 * Full market maintenance routine
 *
 * Performs:
 * 1. Sync new markets from Polymarket
 * 2. Update prices for existing markets
 * 3. Check and resolve completed markets
 *
 * This should be run periodically (e.g., every hour) via cron.
 */
export async function runMarketMaintenance(): Promise<void> {
  console.log('🔧 Running market maintenance...\n');

  try {
    // Step 1: Sync new markets
    await syncMarketsFromPolymarket(50);

    // Step 2: Update prices
    await updateMarketPrices();

    // Step 3: Check for resolutions
    await checkAndResolveMarkets();

    console.log('\n✅ Market maintenance complete!');

  } catch (error) {
    console.error('\n❌ Market maintenance failed:', error);
    throw error;
  }
}
