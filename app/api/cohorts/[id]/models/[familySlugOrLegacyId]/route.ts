/**
 * Agent-Cohort Detail API Endpoint
 *
 * Returns detailed performance data for a specific benchmark family within a specific cohort.
 *
 * @route GET /api/cohorts/[cohortId]/models/[familySlugOrLegacyId]
 */

import { NextRequest } from 'next/server';
import { getAgentCohortDetail } from '@/lib/application/cohorts';
import { jsonError, lookupResultJson } from '@/lib/api/result-response';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; familySlugOrLegacyId: string }> }
) {
  try {
    const { id: cohortId, familySlugOrLegacyId } = await params;
    return lookupResultJson(getAgentCohortDetail(cohortId, familySlugOrLegacyId));

  } catch (error) {
    return jsonError(error);
  }
}
