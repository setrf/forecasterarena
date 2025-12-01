/**
 * Check Resolutions Cron Endpoint
 * 
 * Checks for resolved markets and settles positions.
 * Schedule: Every hour
 * 
 * @route POST /api/cron/check-resolutions
 */

import { NextRequest, NextResponse } from 'next/server';
import { CRON_SECRET } from '@/lib/constants';
import { checkAllResolutions } from '@/lib/engine/resolution';
import { checkAndCompleteCohorts } from '@/lib/engine/cohort';
import { logSystemEvent } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes max

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return token === CRON_SECRET;
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
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



