/**
 * Market Management Engine
 * 
 * Handles market synchronization and updates.
 * 
 * @module engine/market
 */

import { TOP_MARKETS_COUNT } from '../constants';
import { fetchTopMarkets } from '../polymarket/client';
import { upsertMarket, getMarketByPolymarketId } from '../db/queries';
import { logSystemEvent } from '../db';

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

        const duration = Date.now() - startTime;

        logSystemEvent('market_sync_complete', {
            markets_added: added,
            markets_updated: updated,
            errors: errors.length,
            duration_ms: duration
        });

        console.log(`Market sync complete: ${added} added, ${updated} updated, ${errors.length} errors`);

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
