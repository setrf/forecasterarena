/**
 * Market Sync Cron Endpoint
 * 
 * Syncs markets from Polymarket API to local database.
 * Intended external schedule: every 5 minutes
 * 
 * @route POST /api/cron/sync-markets
 */

import { NextRequest } from 'next/server';
import { runMarketSync } from '@/lib/application/cron';
import { cronResultJson } from '@/lib/api/result-response';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return cronResultJson(request, runMarketSync);
}
