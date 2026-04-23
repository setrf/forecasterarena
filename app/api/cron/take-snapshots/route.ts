/**
 * Take Snapshots Cron Endpoint
 * 
 * Takes timestamped mark-to-market portfolio snapshots for all agents.
 * Intended external schedule: every 10 minutes
 * 
 * @route POST /api/cron/take-snapshots
 */

import { NextRequest } from 'next/server';
import { takeSnapshots } from '@/lib/application/cron';
import { cronResultJson } from '@/lib/api/result-response';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return cronResultJson(request, takeSnapshots);
}
