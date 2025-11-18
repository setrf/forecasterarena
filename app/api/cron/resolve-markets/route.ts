import { NextResponse } from 'next/server';
import { queries, resolveMarket } from '@/lib/database';
import { checkMarketResolution } from '@/lib/polymarket';

/**
 * Check closed markets for resolution and settle bets
 * Runs hourly to check if markets have resolved on Polymarket
 */
export async function GET(request: Request) {
  // Verify request is authorized
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('===== MARKET RESOLUTION CHECK START =====', new Date().toISOString());

  try {
    // Get all closed markets (not yet resolved)
    const closedMarkets = queries.getClosedMarkets() as any[];
    console.log(`Found ${closedMarkets.length} closed markets to check`);

    if (closedMarkets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No closed markets to check',
        timestamp: new Date().toISOString()
      });
    }

    const results = [];

    for (const market of closedMarkets as any[]) {
      if (!market.polymarket_id) {
        console.log(`Skipping market ${market.id} - no Polymarket ID`);
        continue;
      }

      try {
        // Check if market has resolved on Polymarket
        const resolution = await checkMarketResolution(market.polymarket_id);

        if (resolution.resolved && resolution.winner) {
          console.log(`Market resolved: "${market.question}" -> ${resolution.winner}`);

          // Settle all pending bets for this market
          resolveMarket(market.id, resolution.winner);

          results.push({
            market: market.question,
            winner: resolution.winner,
            settled: true
          });
        } else {
          console.log(`Market "${market.question}" - not yet resolved`);
        }
      } catch (error) {
        console.error(`Error checking market ${market.polymarket_id}:`, error);
        results.push({
          market: market.question,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('===== MARKET RESOLUTION CHECK END =====');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      markets_checked: closedMarkets.length,
      markets_resolved: results.filter(r => r.settled).length,
      results
    });

  } catch (error) {
    console.error('Market resolution check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also allow POST for manual testing
export async function POST(request: Request) {
  return GET(request);
}
