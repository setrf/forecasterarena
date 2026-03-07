import { NextRequest } from 'next/server';
import { getAdminStats } from '@/lib/application/admin';
import {
  adminNoStoreJson,
  adminSafeErrorJson,
  ensureAdminAuthenticated
} from '@/lib/api/admin-route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResponse = ensureAdminAuthenticated();
  if (authResponse) {
    return authResponse;
  }

  try {
    return adminNoStoreJson(getAdminStats());
  } catch (error) {
    console.error('Admin stats API error:', error);
    return adminSafeErrorJson(error);
  }
}
