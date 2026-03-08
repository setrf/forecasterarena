import { getAdminBenchmarkOverview } from '@/lib/application/admin-benchmark';
import {
  adminNoStoreJson,
  adminSafeErrorJson,
  ensureAdminAuthenticated
} from '@/lib/api/admin-route';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authResponse = ensureAdminAuthenticated();
  if (authResponse) {
    return authResponse;
  }

  try {
    return adminNoStoreJson(getAdminBenchmarkOverview());
  } catch (error) {
    console.error('Admin benchmark API error:', error);
    return adminSafeErrorJson(error);
  }
}
