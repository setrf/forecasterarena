import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_PASSWORD, IS_PRODUCTION } from '@/lib/constants';
import { logSystemEvent } from '@/lib/db';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/auth/adminSessionShared';
import {
  createAdminSessionToken
} from '@/lib/auth/adminSession';
import { verifyAdminPassword } from '@/lib/utils/security';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const attemptStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attemptStore.get(ip);
  if (!entry) {
    return false;
  }

  if (entry.resetAt < now) {
    attemptStore.delete(ip);
    return false;
  }

  return entry.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const entry = attemptStore.get(ip);
  if (!entry || entry.resetAt < now) {
    attemptStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  attemptStore.set(ip, { count: entry.count + 1, resetAt: entry.resetAt });
}

function clearAttempts(ip: string) {
  attemptStore.delete(ip);
}

export function createAdminLoginResponse(request: NextRequest, body: unknown): NextResponse {
  if (IS_PRODUCTION && !ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: 'Admin authentication is not configured' },
      { status: 503 }
    );
  }

  const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const password = typeof payload.password === 'string' ? payload.password : '';
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    );
  }

  if (!password) {
    return NextResponse.json(
      { error: 'Password required' },
      { status: 400 }
    );
  }

  if (!verifyAdminPassword(password, ADMIN_PASSWORD)) {
    logSystemEvent('admin_login_failed', { ip }, 'warning');
    recordFailedAttempt(ip);
    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    );
  }

  const token = createAdminSessionToken(ADMIN_PASSWORD);

  logSystemEvent('admin_login_success', { ip });
  clearAttempts(ip);

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  });

  return response;
}

export function createAdminLogoutResponse(): NextResponse {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(ADMIN_SESSION_COOKIE_NAME);
  return response;
}
