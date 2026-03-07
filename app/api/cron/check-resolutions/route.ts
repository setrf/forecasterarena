/**
 * Check Resolutions Cron Endpoint
 * 
 * Checks for resolved markets and settles positions.
 * Schedule: Every 10 minutes
 * 
 * @route POST /api/cron/check-resolutions
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkResolutions } from '@/lib/application/cron';
import { safeErrorMessage } from '@/lib/utils/security';
import { cronUnauthorizedResponse, isCronAuthorized } from '@/lib/api/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes max

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  const result = await checkResolutions();
  if (!result.ok) {
    return NextResponse.json(
      { error: safeErrorMessage(result.error) },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data);
}
