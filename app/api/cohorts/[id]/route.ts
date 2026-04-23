/**
 * Cohort Detail API Endpoint
 * 
 * Returns detailed cohort data including all agents and performance.
 * 
 * @route GET /api/cohorts/[id]
 */

import { NextRequest } from 'next/server';
import { getCohortDetail } from '@/lib/application/cohorts';
import { jsonError, lookupResultJson } from '@/lib/api/result-response';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return lookupResultJson(getCohortDetail(id));
  } catch (error) {
    return jsonError(error);
  }
}
