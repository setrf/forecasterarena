import { NextRequest } from 'next/server';
import { createAdminLoginResponse, createAdminLogoutResponse } from '@/lib/api/admin-session';
import { adminSafeErrorJson } from '@/lib/api/admin-route';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    return createAdminLoginResponse(request, body);
  } catch (error) {
    return adminSafeErrorJson(error);
  }
}

export async function DELETE(request: NextRequest) {
  return createAdminLogoutResponse();
}
