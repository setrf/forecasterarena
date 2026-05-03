import { NextRequest } from 'next/server';
import {
  getPerformanceDataWithDiagnostics,
  resolvePerformanceRequestScope
} from '@/lib/application/performance';
import { jsonError, jsonMessageError, jsonWithCache } from '@/lib/api/result-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = resolvePerformanceRequestScope(
      searchParams.get('cohort_id'),
      searchParams.get('family_id')
    );
    if (!scope.ok) {
      return jsonMessageError(scope.error, scope.status);
    }

    const result = getPerformanceDataWithDiagnostics(searchParams.get('range'), scope.scope);
    const response = jsonWithCache(
      result.payload,
      'public, max-age=60, stale-while-revalidate=600'
    );
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
    return jsonError(error);
  }
}
