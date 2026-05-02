import { NextResponse } from 'next/server';
import { CRON_SECRET, IS_PRODUCTION } from '@/lib/constants';
import { constantTimeCompare } from '@/lib/utils/security';

/**
 * Validate cron bearer token against CRON_SECRET.
 * Fails closed in production when secret is missing.
 */
export function isCronAuthorized(request: Request): boolean {
  if (IS_PRODUCTION && !CRON_SECRET) {
    return false;
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return false;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) {
    return false;
  }

  const token = match[1];
  return constantTimeCompare(token, CRON_SECRET);
}

export function cronUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
