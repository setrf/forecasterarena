/**
 * Market Management Engine
 * 
 * Handles market synchronization and updates.
 * 
 * @module engine/market
 */

import { TOP_MARKETS_COUNT } from '../constants';
import { fetchTopMarkets, fetchMarketById, simplifyMarket } from '../polymarket/client';
import { upsertMarket, getMarketByPolymarketId } from '../db/queries';
import { logSystemEvent, getDb } from '../db';

/**
 * Result of market synchronization
 */
export interface SyncMarketsResult {
    success: boolean;
    markets_added: number;
    markets_updated: number;
    errors: string[];
    duration_ms: number;
}

/**
 * Sync markets from Polymarket
 * 
 * Fetches top markets and updates local database.
 */
export async function syncMarkets(): Promise<SyncMarketsResult> {
    console.log('Starting market sync...');

    const startTime = Date.now();
    const errors: string[] = [];
    let added = 0;
    let updated = 0;

    try {
        // Fetch markets from Polymarket
        const markets = await fetchTopMarkets(TOP_MARKETS_COUNT);

        console.log(`Fetched ${markets.length} markets from Polymarket`);

        // Upsert each market
        for (const market of markets) {
            try {
                // Check if market exists
                const existing = getMarketByPolymarketId(market.polymarket_id);

                upsertMarket(market);

                if (existing) {
                    updated++;
                } else {
                    added++;
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                errors.push(`${market.polymarket_id}: ${message}`);
            }
        }

        // STEP 2: Re-fetch existing markets that might have changed status
        // This catches markets that closed or resolved since last sync
        // Only check markets that:
        // 1. Have open positions (we care about status changes)
        // 2. OR have close_date in the past but status='active' (likely just closed)
        console.log('Checking existing markets for status updates...');

        const db = getDb();
        const existingMarkets = db.prepare(`
            SELECT DISTINCT m.polymarket_id, m.status
            FROM markets m
            WHERE m.status IN ('active', 'closed')
            AND m.polymarket_id IS NOT NULL
            AND (
                -- Markets with open positions
                EXISTS (
                    SELECT 1 FROM positions p
                    WHERE p.market_id = m.id AND p.status = 'open'
                )
                -- OR markets past close date but still active
                OR (m.status = 'active' AND m.close_date < datetime('now'))
            )
        `).all() as Array<{ polymarket_id: string; status: string }>;

        console.log(`Found ${existingMarkets.length} existing markets to check for updates`);

        let statusUpdates = 0;
        for (const market of existingMarkets) {
            try {
                // Re-fetch from Polymarket API
                const freshData = await fetchMarketById(market.polymarket_id);
                if (freshData) {
                    const simplified = simplifyMarket(freshData);

                    // Only update if status changed
                    if (simplified.status !== market.status) {
                        upsertMarket(simplified);
                        statusUpdates++;
                        console.log(`Status updated for ${market.polymarket_id}: ${market.status} -> ${simplified.status}`);
                    }
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                errors.push(`Status check ${market.polymarket_id}: ${message}`);
            }
        }

        console.log(`Checked ${existingMarkets.length} markets, updated ${statusUpdates} statuses`);

        const duration = Date.now() - startTime;

        logSystemEvent('market_sync_complete', {
            markets_added: added,
            markets_updated: updated,
            status_updates: statusUpdates,
            errors: errors.length,
            duration_ms: duration
        });

        console.log(`Market sync complete: ${added} added, ${updated} updated, ${statusUpdates} status updates, ${errors.length} errors`);

        return {
            success: true,
            markets_added: added,
            markets_updated: updated,
            errors,
            duration_ms: duration
        };

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const duration = Date.now() - startTime;

        logSystemEvent('market_sync_error', { error: message }, 'error');

        throw error;
    }
}
