import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceData } from '@/lib/application/performance';
import { safeErrorMessage } from '@/lib/utils/security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const response = NextResponse.json(
      getPerformanceData(searchParams.get('range'), searchParams.get('cohort_id'))
    );

    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 });
  }
}
