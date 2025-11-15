import { NextRequest, NextResponse } from 'next/server';
import db, { queries } from '@/lib/database';
import { fetchPolymarketMarkets } from '@/lib/polymarket';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting market sync from Polymarket...');

    // Fetch markets from Polymarket
    const markets = await fetchPolymarketMarkets(50);
    console.log(`📊 Fetched ${markets.length} markets from Polymarket`);

    let newMarkets = 0;
    let updatedMarkets = 0;

    for (const market of markets) {
      // Check if market already exists
      const existing = db
        .prepare('SELECT id FROM markets WHERE polymarket_id = ?')
        .get(market.polymarket_id) as { id: string } | undefined;

      if (existing) {
        // Update existing market price and status
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

    return NextResponse.json({
      success: true,
      newMarkets,
      updatedMarkets,
      totalMarkets: newMarkets + updatedMarkets
    });
  } catch (error) {
    console.error('❌ Error syncing markets:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync markets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also allow GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
