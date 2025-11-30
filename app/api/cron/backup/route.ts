/**
 * Database Backup Cron Endpoint
 * 
 * Creates a backup of the database.
 * Schedule: Every Saturday at 23:00 UTC (before Sunday cohort)
 * 
 * @route POST /api/cron/backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { CRON_SECRET } from '@/lib/constants';
import { createBackup, logSystemEvent } from '@/lib/db';

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

