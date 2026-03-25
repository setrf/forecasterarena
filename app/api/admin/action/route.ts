import { NextRequest, NextResponse } from 'next/server';
import { runAdminAction } from '@/lib/application/admin';
import { adminSafeErrorJson, ensureAdminAuthenticated } from '@/lib/api/admin-route';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResponse = ensureAdminAuthenticated();
  if (authResponse) {
    return authResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const result = await runAdminAction(
      typeof payload.action === 'string' ? payload.action : '',
      payload.force === true
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return adminSafeErrorJson(error);
  }
}
