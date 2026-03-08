import { NextRequest, NextResponse } from 'next/server';
import {
  applyAdminBenchmarkRollover,
  getAdminBenchmarkRolloverPreview
} from '@/lib/application/admin-benchmark';
import { ensureAdminAuthenticated } from '@/lib/api/admin-route';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResponse = ensureAdminAuthenticated();
  if (authResponse) {
    return authResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const configId = body && typeof body === 'object' && typeof (body as { config_id?: unknown }).config_id === 'string'
      ? (body as { config_id: string }).config_id
      : '';
    const applyNow = Boolean(body && typeof body === 'object' && (body as { apply?: unknown }).apply);

    const result = applyNow
      ? applyAdminBenchmarkRollover(configId)
      : getAdminBenchmarkRolloverPreview(configId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
