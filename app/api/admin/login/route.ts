/**
 * Admin Login Endpoint
 * 
 * Simple password-based authentication for admin dashboard.
 * Sets a cookie to maintain session.
 * 
 * @route POST /api/admin/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_PASSWORD } from '@/lib/constants';
import { logSystemEvent } from '@/lib/db';
import { verifyAdminPassword } from '@/lib/utils/security';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'forecaster_admin';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const attemptStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attemptStore.get(ip);
  if (!entry) return false;
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;
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

    // Constant-time comparison to prevent timing attacks
    if (!verifyAdminPassword(password, ADMIN_PASSWORD)) {
      logSystemEvent('admin_login_failed', {
        ip
      }, 'warning');
      recordFailedAttempt(ip);

      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Generate a signed session token
    const crypto = await import('crypto');
    const payload = `admin:${Date.now()}`;
    const signature = crypto.createHmac('sha256', ADMIN_PASSWORD).update(payload).digest('hex');
    const token = Buffer.from(`${payload}:${signature}`).toString('base64');

    logSystemEvent('admin_login_success', {
      ip
    });
    clearAttempts(ip);

    const response = NextResponse.json({ success: true });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/'
    });

    return response;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Logout
  const response = NextResponse.json({ success: true });

  response.cookies.delete(COOKIE_NAME);

  return response;
}


