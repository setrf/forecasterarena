/**
 * Database Backup Cron Endpoint
 * 
 * Creates a backup of the database.
 * Schedule: Every Saturday at 23:00 UTC (before Sunday cohort)
 * 
 * @route POST /api/cron/backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBackup, logSystemEvent } from '@/lib/db';
import { cronUnauthorizedResponse, isCronAuthorized } from '@/lib/api/cron-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }
  
  try {
    console.log('Creating database backup...');
    
    const startTime = Date.now();
    
    const backupPath = createBackup();
    
    const duration = Date.now() - startTime;
    
    logSystemEvent('backup_created', {
      path: backupPath,
      duration_ms: duration
    });
    
    console.log(`Backup created: ${backupPath}`);
    
    return NextResponse.json({
      success: true,
      backup_path: backupPath,
      duration_ms: duration
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    
    logSystemEvent('backup_error', { error: message }, 'error');
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

