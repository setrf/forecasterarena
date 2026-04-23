import { NextRequest } from 'next/server';
import { getMarketDetail } from '@/lib/application/markets';
import { jsonError, lookupResultJson } from '@/lib/api/result-response';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return lookupResultJson(getMarketDetail(id));
  } catch (error) {
    return jsonError(error);
  }
}
