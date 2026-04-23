/**
 * Check Resolutions Cron Endpoint
 * 
 * Checks for resolved markets and settles positions.
 * Intended external schedule: every hour
 * 
 * @route POST /api/cron/check-resolutions
 */

import { NextRequest } from 'next/server';
import { checkResolutions } from '@/lib/application/cron';
import { cronResultJson } from '@/lib/api/result-response';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes max

export async function POST(request: NextRequest) {
  return cronResultJson(request, checkResolutions);
}
