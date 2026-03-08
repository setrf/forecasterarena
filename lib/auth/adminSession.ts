import { createHmac } from 'crypto';
import {
  ADMIN_SESSION_MAX_AGE_MS
} from '@/lib/auth/adminSessionShared';
import { constantTimeCompare } from '@/lib/utils/security';

export function createAdminSessionToken(
  adminPassword: string,
  now: number = Date.now()
): string {
  const sessionPayload = `admin:${now}`;
  const signature = createHmac('sha256', adminPassword).update(sessionPayload).digest('hex');
  return Buffer.from(`${sessionPayload}:${signature}`).toString('base64');
}

export function verifyAdminSessionToken(
  token: string | null | undefined,
  adminPassword: string,
  now: number = Date.now()
): boolean {
  if (!token || !adminPassword) {
    return false;
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');

    if (parts.length !== 3) return false;

    const [role, timestamp, signature] = parts;

    if (role !== 'admin') return false;

    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime)) return false;
    if (now - tokenTime > ADMIN_SESSION_MAX_AGE_MS) return false;

    const payload = `${role}:${timestamp}`;
    const expectedSignature = createHmac('sha256', adminPassword).update(payload).digest('hex');
    return constantTimeCompare(signature, expectedSignature);
  } catch {
    return false;
  }
}
