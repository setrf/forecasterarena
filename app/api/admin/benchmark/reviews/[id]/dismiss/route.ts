import { NextRequest } from 'next/server';
import { dismissModelLineupReviewRecord } from '@/lib/application/admin-benchmark';
import { adminApplicationResultJson, withAdminAuth } from '@/lib/api/admin-route';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminAuth(() => adminApplicationResultJson(
    dismissModelLineupReviewRecord(params.id)
  ));
}
