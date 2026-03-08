import { NextRequest, NextResponse } from 'next/server';
import { createAdminBenchmarkConfigRecord } from '@/lib/application/admin-benchmark';
import { ensureAdminAuthenticated } from '@/lib/api/admin-route';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResponse = ensureAdminAuthenticated();
  if (authResponse) {
    return authResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = createAdminBenchmarkConfigRecord(
      body && typeof body === 'object' ? body as Parameters<typeof createAdminBenchmarkConfigRecord>[0] : {} as never
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
