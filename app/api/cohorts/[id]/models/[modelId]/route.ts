/**
 * Agent-Cohort Detail API Endpoint
 *
 * Returns detailed performance data for a specific model within a specific cohort.
 *
 * @route GET /api/cohorts/[cohortId]/models/[modelId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAgentCohortDetail } from '@/lib/application/cohorts';
import { safeErrorMessage } from '@/lib/utils/security';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  try {
    const { id: cohortId, modelId } = await params;
    const result = getAgentCohortDetail(cohortId, modelId);

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
