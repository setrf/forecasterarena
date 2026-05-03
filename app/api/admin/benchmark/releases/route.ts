import { NextRequest } from 'next/server';
import { createAdminModelReleaseRecord } from '@/lib/application/admin-benchmark';
import {
  adminApplicationResultJson,
  readAdminJsonObject,
  withAdminAuth
} from '@/lib/api/admin-route';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return withAdminAuth(async () => adminApplicationResultJson(
    createAdminModelReleaseRecord(
      await readAdminJsonObject(request) as unknown as Parameters<typeof createAdminModelReleaseRecord>[0]
    )
  ));
}
