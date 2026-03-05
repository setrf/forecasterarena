/**
 * Check Resolutions Cron Endpoint
 * 
 * Checks for resolved markets and settles positions.
 * Schedule: Every 10 minutes
 * 
 * @route POST /api/cron/check-resolutions
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAllResolutions } from '@/lib/engine/resolution';
import { checkAndCompleteCohorts } from '@/lib/engine/cohort';
import { logSystemEvent } from '@/lib/db';
import { cronUnauthorizedResponse, isCronAuthorized } from '@/lib/api/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes max

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }
  
  try {
    console.log('Checking for market resolutions...');
    
    const startTime = Date.now();
    
    // Check for resolved markets
    const result = await checkAllResolutions();
    
    // Check if any cohorts are now complete
    const cohortsCompleted = checkAndCompleteCohorts();
    
    const duration = Date.now() - startTime;
    
    console.log(
      `Resolution check complete: ${result.markets_resolved} resolved, ` +
      `${cohortsCompleted} cohorts completed`
    );
    
    return NextResponse.json({
      success: true,
      markets_checked: result.markets_checked,
      markets_resolved: result.markets_resolved,
      positions_settled: result.positions_settled,
      cohorts_completed: cohortsCompleted,
      errors: result.errors.length,
      duration_ms: duration
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    
    logSystemEvent('check_resolutions_error', { error: message }, 'error');
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
