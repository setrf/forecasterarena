import { NextRequest, NextResponse } from 'next/server';
import { createAdminModelReleaseRecord } from '@/lib/application/admin-benchmark';
import { adminSafeErrorJson, ensureAdminAuthenticated } from '@/lib/api/admin-route';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResponse = ensureAdminAuthenticated();
  if (authResponse) {
    return authResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = createAdminModelReleaseRecord(
      body && typeof body === 'object' ? body as Parameters<typeof createAdminModelReleaseRecord>[0] : {} as never
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return adminSafeErrorJson(error);
  }
}
