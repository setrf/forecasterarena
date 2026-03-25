import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_PASSWORD, IS_PRODUCTION } from '@/lib/constants';
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_MS
} from '@/lib/auth/adminSessionShared';
import { getRateLimitKeyFromRequest } from '@/lib/middleware/ip';
import { matchRateLimitPolicy } from '@/lib/middleware/policies';
import { applyRateLimit } from '@/lib/middleware/rateLimit';

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || (IS_PRODUCTION ? '' : 'dev-admin-session-secret');
const textEncoder = new TextEncoder();

function decodeToken(token: string): string {
  if (typeof atob === 'function') {
    return atob(token);
  }

  throw new Error('Base64 decoding is unavailable in the current runtime');
}

async function verifyAdminSessionTokenForMiddleware(
  token: string | undefined,
  sessionSecret: string,
  now: number = Date.now()
): Promise<boolean> {
  if (!token || !sessionSecret) {
    return false;
  }

  try {
    const decoded = decodeToken(token);
    const parts = decoded.split(':');
    if (parts.length !== 3) {
      return false;
    }

    const [role, timestamp, signature] = parts;
    if (role !== 'admin') {
      return false;
    }

    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime) || now - tokenTime > ADMIN_SESSION_MAX_AGE_MS) {
      return false;
    }

    const key = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(sessionSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signed = await crypto.subtle.sign(
      'HMAC',
      key,
      textEncoder.encode(`${role}:${timestamp}`)
    );
    const expectedSignature = Array.from(new Uint8Array(signed))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    return signature === expectedSignature;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const policy = matchRateLimitPolicy(path, request.method);
  if (!policy) {
    return NextResponse.next();
  }

  if (
    policy.bucket === 'admin' &&
    (!IS_PRODUCTION || (ADMIN_PASSWORD && ADMIN_SESSION_SECRET)) &&
    await verifyAdminSessionTokenForMiddleware(
      request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value,
      ADMIN_SESSION_SECRET
    )
  ) {
    return NextResponse.next();
  }

  const status = applyRateLimit(
    getRateLimitKeyFromRequest(request, policy.bucket),
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
