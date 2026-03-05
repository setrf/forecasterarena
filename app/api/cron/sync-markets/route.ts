/**
 * Market Sync Cron Endpoint
 * 
 * Syncs markets from Polymarket API to local database.
 * Schedule: Every 10 minutes
 * 
 * @route POST /api/cron/sync-markets
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncMarkets } from '@/lib/engine/market';
import { cronUnauthorizedResponse, isCronAuthorized } from '@/lib/api/cron-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Verify authentication
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  try {
    const result = await syncMarkets();

    return NextResponse.json(result);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
