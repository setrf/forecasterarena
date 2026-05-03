/**
 * Recent Decisions API Endpoint
 * 
 * Returns the most recent LLM decisions across all cohorts.
 * 
 * @route GET /api/decisions/recent
 */

import { NextRequest } from 'next/server';
import { listRecentDecisions } from '@/lib/application/decisions';
import { jsonError, jsonWithCache } from '@/lib/api/result-response';
import { parseIntParam } from '@/lib/utils/security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseIntParam(searchParams.get('limit'), 10, 50);
    return jsonWithCache(
      listRecentDecisions(limit),
      'public, max-age=120, stale-while-revalidate=30'
    );
  } catch (error) {
    return jsonError(error);
  }
}
