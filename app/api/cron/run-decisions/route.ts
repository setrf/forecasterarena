/**
 * Run Decisions Cron Endpoint
 * 
 * Runs weekly LLM decisions for all active cohorts.
 * Schedule: Every Sunday at 00:05 UTC (after start-cohort)
 * 
 * @route POST /api/cron/run-decisions
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDecisions } from '@/lib/application/cron';
import { safeErrorMessage } from '@/lib/utils/security';
import { cronUnauthorizedResponse, isCronAuthorized } from '@/lib/api/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes max; model calls are capped to fit the full sequential run

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  const result = await runDecisions();
  if (!result.ok) {
    return NextResponse.json(
      { error: safeErrorMessage(result.error) },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data);
}
