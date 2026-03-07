import { NextRequest } from 'next/server';
import { getAdminLogs, type AdminSeverityFilter } from '@/lib/application/admin';
import { parseIntParam } from '@/lib/utils/security';
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
    const { searchParams } = new URL(request.url);
    return adminNoStoreJson(
      getAdminLogs(
        (searchParams.get('severity') || 'all') as AdminSeverityFilter,
        parseIntParam(searchParams.get('limit'), 100, 500)
      )
    );
  } catch (error) {
    console.error('Admin logs API error:', error);
    return adminSafeErrorJson(error);
  }
}
