import { NextRequest, NextResponse } from 'next/server';
import { createAdminLoginResponse, createAdminLogoutResponse } from '@/lib/api/admin-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    return createAdminLoginResponse(request, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  return createAdminLogoutResponse();
}
