/**
 * Health Check Endpoint
 * 
 * Returns system health status for monitoring.
 * 
 * @route GET /api/health
 */

import { NextResponse } from 'next/server';
import { getHealthHttpStatus, getHealthReport } from '@/lib/application/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const healthReport = getHealthReport();

  return NextResponse.json(healthReport, {
    status: getHealthHttpStatus(healthReport.status)
  });
}
