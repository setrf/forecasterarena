/**
 * Admin Logs API Endpoint
 *
 * Returns system logs with filtering.
 *
 * @route GET /api/admin/logs
 */

import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { parseIntParam } from '@/lib/utils/security';
import {
  adminNoStoreJson,
  adminSafeErrorJson,
  ensureAdminAuthenticated
} from '@/lib/api/admin-route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResponse = ensureAdminAuthenticated();
  if (authResponse) {
    return authResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const limit = parseIntParam(searchParams.get('limit'), 100, 500);
    
    const db = getDb();
    
    let query = 'SELECT * FROM system_logs';
    const params: (string | number)[] = [];
    
    if (severity && severity !== 'all') {
      query += ' WHERE severity = ?';
      params.push(severity);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const logs = db.prepare(query).all(...params);
    
    return adminNoStoreJson({
      logs,
      updated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin logs API error:', error);
    return adminSafeErrorJson(error);
  }
}

