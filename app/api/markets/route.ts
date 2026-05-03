import { NextRequest } from 'next/server';
import { listMarkets, type MarketSortOption } from '@/lib/application/markets';
import { jsonError, noStoreJson } from '@/lib/api/result-response';
import { parseIntParam } from '@/lib/utils/security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    return noStoreJson(listMarkets({
      status: searchParams.get('status') || 'active',
      category: searchParams.get('category'),
      search: searchParams.get('search'),
      sort: (searchParams.get('sort') || 'volume') as MarketSortOption,
      withCohortBets: searchParams.get('cohort_bets') === 'true',
      limit: parseIntParam(searchParams.get('limit'), 50, 100),
      offset: parseIntParam(searchParams.get('offset'), 0)
    }));
  } catch (error) {
    return jsonError(error);
  }
}
