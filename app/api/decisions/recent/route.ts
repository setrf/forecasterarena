/**
 * Recent Decisions API Endpoint
 * 
 * Returns the most recent LLM decisions across all cohorts.
 * 
 * @route GET /api/decisions/recent
 */

import { NextRequest, NextResponse } from 'next/server';
import { listRecentDecisions } from '@/lib/application/decisions';
import { parseIntParam, safeErrorMessage } from '@/lib/utils/security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseIntParam(searchParams.get('limit'), 10, 50);
    const response = NextResponse.json(listRecentDecisions(limit));

    // Cache for 2 minutes - decisions are more time-sensitive
    response.headers.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=30');
    return response;
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 });
  }
}
