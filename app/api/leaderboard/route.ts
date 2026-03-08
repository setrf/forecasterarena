/**
 * Leaderboard API Endpoint
 * 
 * Returns aggregate leaderboard data across all cohorts.
 * 
 * @route GET /api/leaderboard
 */

import { NextResponse } from 'next/server';
import { getLeaderboardData } from '@/lib/application/leaderboard';
import { safeErrorMessage } from '@/lib/utils/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = NextResponse.json(getLeaderboardData());

    response.headers.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=45');
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
