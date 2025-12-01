/**
 * Leaderboard API Endpoint
 * 
 * Returns aggregate leaderboard data across all cohorts.
 * 
 * @route GET /api/leaderboard
 */

import { NextResponse } from 'next/server';
import { getAggregateLeaderboard, getCohortSummaries } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const leaderboard = getAggregateLeaderboard();
    const cohorts = getCohortSummaries();
    
    return NextResponse.json({
      leaderboard,
      cohorts,
      updated_at: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}



