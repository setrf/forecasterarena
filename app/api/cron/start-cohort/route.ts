/**
 * Start Cohort Cron Endpoint
 * 
 * Starts a new cohort every Sunday.
 * Schedule: Every Sunday at 00:00 UTC (before decisions)
 * 
 * @route POST /api/cron/start-cohort
 */

import { NextRequest, NextResponse } from 'next/server';
import { CRON_SECRET } from '@/lib/constants';
import { maybeStartNewCohort } from '@/lib/engine/cohort';
import { logSystemEvent } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}


