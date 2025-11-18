import { NextResponse } from 'next/server';
import db from '@/lib/database';

/**
 * Market Status Update Cron Job
 *
 * Runs every 5 minutes to automatically close markets whose close_date has passed.
 * This ensures:
 * - No new bets can be placed on expired markets
 * - MTM calculations exclude closed markets (stale prices)
 * - Resolution cron can find closed markets ready to resolve
 *
 * CRITICAL for accounting accuracy!
 */
export async function GET(request: Request) {
  // Verify request is authorized
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('===== MARKET STATUS UPDATE START =====', new Date().toISOString());

  try {
    // Update any markets where close_date has passed but status is still 'active'
    const result = db.prepare(`
      UPDATE markets
      SET status = 'closed', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active' AND close_date <= datetime('now')
    `).run();

    const closedCount = result.changes;

    if (closedCount > 0) {
      console.log(`✅ Closed ${closedCount} expired market(s)`);

      // Show which markets were closed
      const closedMarkets = db.prepare(`
        SELECT id, question, close_date
        FROM markets
        WHERE status = 'closed' AND updated_at >= datetime('now', '-1 minute')
        ORDER BY close_date DESC
        LIMIT 10
      `).all();

      closedMarkets.forEach((market: any) => {
        console.log(`   - "${market.question.substring(0, 60)}${market.question.length > 60 ? '...' : ''}"`);
      });
    } else {
      console.log('✓ No markets needed closing');
    }

    console.log('===== MARKET STATUS UPDATE END =====');

    return NextResponse.json({
      success: true,
      marketsClosed: closedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Market status update error:', error);
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
