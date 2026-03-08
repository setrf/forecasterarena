import { cookies } from 'next/headers';
import { ADMIN_PASSWORD, IS_PRODUCTION } from '@/lib/constants';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/auth/adminSessionShared';
import { verifyAdminSessionToken } from '@/lib/auth/adminSession';

export function isAuthenticated(): boolean {
  try {
    if (IS_PRODUCTION && !ADMIN_PASSWORD) {
      return false;
    }

    const cookieStore = cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    return verifyAdminSessionToken(token, ADMIN_PASSWORD);
  } catch {
    return false;
  }
}
