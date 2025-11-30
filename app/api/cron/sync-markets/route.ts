/**
 * Market Sync Cron Endpoint
 * 
 * Syncs markets from Polymarket API to local database.
 * Schedule: Every 6 hours
 * 
 * @route POST /api/cron/sync-markets
 */

import { NextRequest, NextResponse } from 'next/server';
import { CRON_SECRET, TOP_MARKETS_COUNT } from '@/lib/constants';
import { fetchTopMarkets } from '@/lib/polymarket/client';
import { upsertMarket } from '@/lib/db/queries';
import { logSystemEvent } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Verify cron secret from request
 */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '');
  return token === CRON_SECRET;
}

export async function POST(request: NextRequest) {
  // Verify authentication
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    console.log('Starting market sync...');
    
    const startTime = Date.now();
    
    // Fetch markets from Polymarket
    const markets = await fetchTopMarkets(TOP_MARKETS_COUNT);
    
    console.log(`Fetched ${markets.length} markets from Polymarket`);
    
    let added = 0;
    let updated = 0;
    const errors: string[] = [];
    
    // Upsert each market
    for (const market of markets) {
      try {
        // Check if market exists
        const existing = await import('@/lib/db/queries').then(
          m => m.getMarketByPolymarketId(market.polymarket_id)
        );
        
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
    
    return NextResponse.json({
      success: true,
      markets_added: added,
      markets_updated: updated,
      errors: errors.length,
      duration_ms: duration
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    
    logSystemEvent('market_sync_error', { error: message }, 'error');
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}


