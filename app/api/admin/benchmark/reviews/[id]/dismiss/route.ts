import { NextRequest, NextResponse } from 'next/server';
import { dismissModelLineupReviewRecord } from '@/lib/application/admin-benchmark';
import { adminSafeErrorJson, ensureAdminAuthenticated } from '@/lib/api/admin-route';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResponse = ensureAdminAuthenticated();
  if (authResponse) {
    return authResponse;
  }

  try {
    const result = dismissModelLineupReviewRecord(params.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return adminSafeErrorJson(error);
  }
}
