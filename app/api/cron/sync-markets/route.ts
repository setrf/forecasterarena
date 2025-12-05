/**
 * Market Sync Cron Endpoint
 * 
 * Syncs markets from Polymarket API to local database.
 * Schedule: Every 10 minutes
 * 
 * @route POST /api/cron/sync-markets
 */

import { NextRequest, NextResponse } from 'next/server';
import { CRON_SECRET } from '@/lib/constants';
import { syncMarkets } from '@/lib/engine/market';
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



