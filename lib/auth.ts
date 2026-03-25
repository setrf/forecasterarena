import { cookies } from 'next/headers';
import { ADMIN_PASSWORD, IS_PRODUCTION } from '@/lib/constants';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/auth/adminSessionShared';
import { verifyAdminSessionToken } from '@/lib/auth/adminSession';

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || (IS_PRODUCTION ? '' : 'dev-admin-session-secret');

export function isAuthenticated(): boolean {
  try {
    if (IS_PRODUCTION && (!ADMIN_PASSWORD || !ADMIN_SESSION_SECRET)) {
      return false;
    }

    const cookieStore = cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    return verifyAdminSessionToken(token, ADMIN_SESSION_SECRET);
  } catch {
    return false;
  }
}
