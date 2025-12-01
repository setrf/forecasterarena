/**
 * Database Maintenance Cron Endpoint
 * 
 * Runs maintenance tasks like log cleanup.
 * Schedule: Weekly (e.g., Sunday 01:00 UTC)
 * 
 * @route POST /api/cron/maintenance
 */

import { NextRequest, NextResponse } from 'next/server';
import { CRON_SECRET } from '@/lib/constants';
import { logSystemEvent } from '@/lib/db';
import { runMaintenance } from '@/lib/db/maintenance';

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
    console.log('Running database maintenance...');
    
    const startTime = Date.now();
    const result = runMaintenance();
    const duration = Date.now() - startTime;
    
    logSystemEvent('maintenance_complete', {
      logs_deleted: result.logs_deleted,
      duration_ms: duration
    });
    
    console.log(`Maintenance complete: ${result.logs_deleted} logs deleted`);
    
    return NextResponse.json({
      success: true,
      ...result,
      duration_ms: duration
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    
    logSystemEvent('maintenance_error', { error: message }, 'error');
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

