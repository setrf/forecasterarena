/**
 * Start Cohort Cron Endpoint
 * 
 * Starts a new cohort every Sunday.
 * Schedule: Every Sunday at 00:00 UTC (before decisions)
 * 
 * @route POST /api/cron/start-cohort
 */

import { NextRequest } from 'next/server';
import { startCohort } from '@/lib/application/cron';
import { cronResultJson } from '@/lib/api/result-response';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return cronResultJson(
    request,
    () => startCohort(new URL(request.url).searchParams.get('force') === 'true')
  );
}
