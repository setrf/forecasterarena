import { getDb } from '../index';
import type { SystemLog } from '../../types';

export function getRecentLogs(limit: number = 100): SystemLog[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM system_logs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as SystemLog[];
}

export function getLogsBySeverity(severity: 'info' | 'warning' | 'error', limit: number = 100): SystemLog[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM system_logs
    WHERE severity = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(severity, limit) as SystemLog[];
}
