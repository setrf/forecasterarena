import { NextRequest } from 'next/server';
import { promoteAdminBenchmarkConfig } from '@/lib/application/admin-benchmark';
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
    return adminApplicationResultJson(promoteAdminBenchmarkConfig(configId));
  });
}
