/**
 * Database Backup Cron Endpoint
 * 
 * Creates a backup of the database.
 * Schedule: daily at 02:00 UTC
 * 
 * @route POST /api/cron/backup
 */

import { NextRequest } from 'next/server';
import { createDatabaseBackup } from '@/lib/application/cron';
import { cronResultJson } from '@/lib/api/result-response';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return cronResultJson(request, createDatabaseBackup);
}
