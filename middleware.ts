import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRateLimitKey } from '@/lib/middleware/ip';
import { matchRateLimitPolicy } from '@/lib/middleware/policies';
import { applyRateLimit } from '@/lib/middleware/rateLimit';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const policy = matchRateLimitPolicy(path, request.method);
  if (!policy) {
    return NextResponse.next();
  }

  const status = applyRateLimit(
    getRateLimitKey(request.headers, policy.bucket),
    policy.limit,
    policy.windowMs
  );

  if (status.limited) {
    return NextResponse.json(
      { error: policy.limitedMessage },
      {
        status: 429,
        headers: policy.limitedHeaders
      }
    );
  }

  const response = NextResponse.next();
  const successHeaders = policy.successHeaders?.(status.remaining);
  if (successHeaders) {
    for (const [name, value] of Object.entries(successHeaders)) {
      response.headers.set(name, value);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/cron/:path*',
  ],
};
