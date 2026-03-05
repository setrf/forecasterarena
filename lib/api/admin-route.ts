import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { safeErrorMessage } from '@/lib/utils/security';

export function ensureAdminAuthenticated(): NextResponse | null {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export function adminNoStoreJson(body: unknown, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

export function adminSafeErrorJson(error: unknown, status: number = 500): NextResponse {
  return NextResponse.json(
    { error: safeErrorMessage(error) },
    { status }
  );
}
