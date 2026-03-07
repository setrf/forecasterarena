import { getDb } from '@/lib/db';
import type { AdminSeverityFilter } from '@/lib/application/admin/types';

export function getAdminLogs(severity: AdminSeverityFilter, limit: number) {
  const db = getDb();
  let query = 'SELECT * FROM system_logs';
  const params: Array<string | number> = [];

  if (severity !== 'all') {
    query += ' WHERE severity = ?';
    params.push(severity);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  return {
    logs: db.prepare(query).all(...params),
    updated_at: new Date().toISOString()
  };
}
