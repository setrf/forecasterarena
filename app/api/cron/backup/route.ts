/**
 * Database Backup Cron Endpoint
 * 
 * Creates a backup of the database.
 * Schedule: Every Saturday at 23:00 UTC (before Sunday cohort)
 * 
 * @route POST /api/cron/backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { createDatabaseBackup } from '@/lib/application/cron';
import { safeErrorMessage } from '@/lib/utils/security';
import { cronUnauthorizedResponse, isCronAuthorized } from '@/lib/api/cron-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse();
  }

  const result = createDatabaseBackup();
  if (!result.ok) {
    return NextResponse.json(
      { error: safeErrorMessage(result.error) },
      { status: result.status }
    );
  }

  return NextResponse.json(result.data);
}
