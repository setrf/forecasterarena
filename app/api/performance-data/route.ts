import { NextRequest, NextResponse } from 'next/server';
import {
  getPerformanceDataWithDiagnostics,
  resolvePerformanceRequestScope
} from '@/lib/application/performance';
import { safeErrorMessage } from '@/lib/utils/security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = resolvePerformanceRequestScope(
      searchParams.get('cohort_id'),
      searchParams.get('family_id')
    );
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const result = getPerformanceDataWithDiagnostics(searchParams.get('range'), scope.scope);
    const response = NextResponse.json(result.payload);

    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
    response.headers.set(
      'Server-Timing',
      [
        `total;dur=${result.diagnostics.total_ms.toFixed(1)}`,
        `query;dur=${result.diagnostics.query_ms.toFixed(1)}`,
        `cache;desc="${result.diagnostics.cache}"`,
        `points;desc="${result.diagnostics.points}"`,
        `bytes;desc="${result.diagnostics.bytes}"`
      ].join(', ')
    );
    return response;
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 });
  }
}
