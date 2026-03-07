/**
 * Start Cohort Cron Endpoint
 * 
 * Starts a new cohort every Sunday.
 * Schedule: Every Sunday at 00:00 UTC (before decisions)
 * 
 * @route POST /api/cron/start-cohort
 */

import { NextRequest, NextResponse } from 'next/server';
import { startCohort } from '@/lib/application/cron';
import { safeErrorMessage } from '@/lib/utils/security';
import { cronUnauthorizedResponse, isCronAuthorized } from '@/lib/api/cron-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  const force = new URL(request.url).searchParams.get('force') === 'true';
  const result = startCohort(force);

  if (!result.ok) {
    return NextResponse.json(
      { error: safeErrorMessage(result.error) },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data);
}
