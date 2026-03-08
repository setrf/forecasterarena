/**
 * Agent-Cohort Detail API Endpoint
 *
 * Returns detailed performance data for a specific benchmark family within a specific cohort.
 *
 * @route GET /api/cohorts/[cohortId]/models/[familySlugOrLegacyId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAgentCohortDetail } from '@/lib/application/cohorts';
import { safeErrorMessage } from '@/lib/utils/security';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; familySlugOrLegacyId: string }> }
) {
  try {
    const { id: cohortId, familySlugOrLegacyId } = await params;
    const result = getAgentCohortDetail(cohortId, familySlugOrLegacyId);

    if (result.status === 'not_found') {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.data);

  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
