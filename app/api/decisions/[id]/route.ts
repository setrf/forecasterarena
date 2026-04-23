import { NextRequest } from 'next/server';
import { getDecisionDetail } from '@/lib/application/decisions';
import { jsonError, lookupResultJson } from '@/lib/api/result-response';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return lookupResultJson(getDecisionDetail(id));
  } catch (error) {
    return jsonError(error);
  }
}
