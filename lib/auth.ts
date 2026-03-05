/**
 * Admin Authentication Utilities
 *
 * Provides authentication verification for admin endpoints.
 */

import { cookies } from 'next/headers';
import { createHmac } from 'crypto';
import { ADMIN_PASSWORD, IS_PRODUCTION } from '@/lib/constants';
import { constantTimeCompare } from '@/lib/utils/security';

/**
 * Session expiration time in milliseconds (7 days)
 * Matches the cookie maxAge set in login route
 */
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Check if the current request is authenticated as admin.
 * Verifies the admin session cookie using HMAC signature with constant-time comparison.
 * Also validates session expiration based on timestamp.
 */
export function isAuthenticated(): boolean {
  try {
    if (IS_PRODUCTION && !ADMIN_PASSWORD) {
      return false;
    }

    const cookieStore = cookies();
    const tokenCookie = cookieStore.get('forecaster_admin');

    if (!tokenCookie?.value) return false;

    const decoded = Buffer.from(tokenCookie.value, 'base64').toString('utf8');
    const parts = decoded.split(':');

    if (parts.length !== 3) return false;

    const [role, timestamp, signature] = parts;

    if (role !== 'admin') return false;

    // Validate session expiration
    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime)) return false;

    const now = Date.now();
    if (now - tokenTime > SESSION_MAX_AGE_MS) {
      // Session has expired
      return false;
    }

    const payload = `${role}:${timestamp}`;
    const expectedSignature = createHmac('sha256', ADMIN_PASSWORD).update(payload).digest('hex');

    // Use constant-time comparison to prevent timing attacks
    return constantTimeCompare(signature, expectedSignature);
  } catch {
    return false;
  }
}
