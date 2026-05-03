/**
 * Leaderboard API Endpoint
 * 
 * Returns aggregate leaderboard data across all cohorts.
 * 
 * @route GET /api/leaderboard
 */

import { getLeaderboardData } from '@/lib/application/leaderboard';
import { jsonError, jsonWithCache } from '@/lib/api/result-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return jsonWithCache(
      getLeaderboardData(),
      'public, max-age=15, stale-while-revalidate=45'
    );
  } catch (error) {
    return jsonError(error);
  }
}
