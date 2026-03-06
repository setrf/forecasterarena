/**
 * Leaderboard API Endpoint
 * 
 * Returns aggregate leaderboard data across all cohorts.
 * 
 * @route GET /api/leaderboard
 */

import { NextResponse } from 'next/server';
import { getAggregateLeaderboard, getCohortSummaries } from '@/lib/db/queries';
import { safeErrorMessage } from '@/lib/utils/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const leaderboard = getAggregateLeaderboard();
    const cohorts = getCohortSummaries();

    const response = NextResponse.json({
      leaderboard,
      cohorts,
      updated_at: new Date().toISOString()
    });

    response.headers.set('Cache-Control', 'no-store');
    return response;

  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}


