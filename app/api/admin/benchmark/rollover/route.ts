import { NextRequest } from 'next/server';
import {
  applyAdminBenchmarkRollover,
  getAdminBenchmarkRolloverPreview
} from '@/lib/application/admin-benchmark';
import {
  adminApplicationResultJson,
  readAdminJsonObject,
  withAdminAuth
} from '@/lib/api/admin-route';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return withAdminAuth(async () => {
    const body = await readAdminJsonObject(request);
    const configId = typeof body.config_id === 'string' ? body.config_id : '';
    const applyNow = Boolean(body.apply);
    const result = applyNow
      ? applyAdminBenchmarkRollover(configId)
      : getAdminBenchmarkRolloverPreview(configId);

    return adminApplicationResultJson(result);
  });
}
