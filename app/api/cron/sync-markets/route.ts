/**
 * Market Sync Cron Endpoint
 * 
 * Syncs markets from Polymarket API to local database.
 * Intended external schedule: every 5 minutes
 * 
 * @route POST /api/cron/sync-markets
 */

import { NextRequest, NextResponse } from 'next/server';
import { runMarketSync } from '@/lib/application/cron';
import { safeErrorMessage } from '@/lib/utils/security';
import { cronUnauthorizedResponse, isCronAuthorized } from '@/lib/api/cron-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  const result = await runMarketSync();
  if (!result.ok) {
    return NextResponse.json(
      { error: safeErrorMessage(result.error) },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data);
}
