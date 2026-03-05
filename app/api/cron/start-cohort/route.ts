/**
 * Start Cohort Cron Endpoint
 * 
 * Starts a new cohort every Sunday.
 * Schedule: Every Sunday at 00:00 UTC (before decisions)
 * 
 * @route POST /api/cron/start-cohort
 */

import { NextRequest, NextResponse } from 'next/server';
import { maybeStartNewCohort } from '@/lib/engine/cohort';
import { logSystemEvent } from '@/lib/db';
import { safeErrorMessage } from '@/lib/utils/security';
import { cronUnauthorizedResponse, isCronAuthorized } from '@/lib/api/cron-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }
  
  try {
    // Check for force parameter
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    
    console.log('Checking if new cohort should start...');
    
    const result = maybeStartNewCohort(force);
    
    if (result.success && result.cohort) {
      console.log(`Started Cohort #${result.cohort.cohort_number}`);
      
      return NextResponse.json({
        success: true,
        cohort_id: result.cohort.id,
        cohort_number: result.cohort.cohort_number,
        agents_created: result.agents?.length || 0
      });
    } else {
      console.log('No new cohort started:', result.error);
      
      return NextResponse.json({
        success: false,
        message: result.error || 'Conditions not met for new cohort'
      });
    }
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logSystemEvent('start_cohort_error', { error: message }, 'error');
    console.error('Start cohort error:', error);

    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

