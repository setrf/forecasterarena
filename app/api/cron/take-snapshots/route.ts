/**
 * Take Snapshots Cron Endpoint
 * 
 * Takes timestamped mark-to-market portfolio snapshots for all agents.
 * Intended external schedule: every 10 minutes
 * 
 * @route POST /api/cron/take-snapshots
 */

import { NextRequest, NextResponse } from 'next/server';
import { takeSnapshots } from '@/lib/application/cron';
import { safeErrorMessage } from '@/lib/utils/security';
import { cronUnauthorizedResponse, isCronAuthorized } from '@/lib/api/cron-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  const result = await takeSnapshots();
  if (!result.ok) {
    return NextResponse.json(
      { error: safeErrorMessage(result.error) },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data);
}
