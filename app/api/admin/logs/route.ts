/**
 * Admin Logs API Endpoint
 * 
 * Returns system logs with filtering.
 * 
 * @route GET /api/admin/logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    
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
    
    return NextResponse.json({
      logs,
      updated_at: new Date().toISOString()
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

