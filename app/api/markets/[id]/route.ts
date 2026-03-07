import { NextRequest, NextResponse } from 'next/server';
import { getMarketDetail } from '@/lib/application/markets';
import { safeErrorMessage } from '@/lib/utils/security';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = getMarketDetail(id);

    if (result.status === 'not_found') {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 });
  }
}
