import { NextResponse } from 'next/server';
import { checkModelLineupReview } from '@/lib/application/admin-benchmark';
import { adminSafeErrorJson, ensureAdminAuthenticated } from '@/lib/api/admin-route';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const authResponse = ensureAdminAuthenticated();
  if (authResponse) {
    return authResponse;
  }

  try {
    return NextResponse.json(await checkModelLineupReview());
  } catch (error) {
    return adminSafeErrorJson(error);
  }
}
