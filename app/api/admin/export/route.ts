/**
 * Admin Export Endpoint
 *
 * Provides a small, bounded export (CSV+zip) of selected tables for a cohort
 * and time window. Designed to be light on the server: capped by date range,
 * row counts, and only accessible to authenticated admins.
 *
 * POST /api/admin/export
 *  - Body: { cohort_id: string, from: string, to: string, tables?: string[], include_prompts?: boolean }
 *  - Returns: { download_url, info }
 *
 * GET /api/admin/export?file=export-file.zip
 *  - Streams a previously generated export (admin-auth required)
 */

import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminAuthenticated } from '@/lib/api/admin-route';
import { createAdminExport, resolveAdminExportDownload } from '@/lib/application/admin-export';

export const dynamic = 'force-dynamic';

function ensureAuth() {
  return ensureAdminAuthenticated();
}
async function handlePost(request: NextRequest) {
  const authResponse = ensureAuth();
  if (authResponse) {
    return authResponse;
  }

  const body = await request.json().catch(() => ({}));
  const result = createAdminExport(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    success: true,
    download_url: result.data.download_url,
    info: result.data.info
  });
}

async function handleGet(request: NextRequest) {
  const authResponse = ensureAuth();
  if (authResponse) {
    return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const result = resolveAdminExportDownload(searchParams.get('file'));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const data = fs.readFileSync(result.data.filePath);
  return new NextResponse(data, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${result.data.filename}"`
    }
  });
}

export async function POST(request: NextRequest) {
  return handlePost(request);
}

export async function GET(request: NextRequest) {
  return handleGet(request);
}
