/**
 * Database Maintenance Utilities
 * 
 * Functions for cleaning up old data and maintaining database health.
 * 
 * @module db/maintenance
 */

import { getDb, logSystemEvent } from './index';

/**
 * Clean up old system logs
 * 
 * Removes logs older than 90 days to prevent database bloat.
 * Keeps at least the last 10,000 log entries regardless of age.
 * 
 * @returns Number of logs deleted
 */
export function cleanupOldLogs(): number {
  const db = getDb();
  
  try {
    // Get count of logs older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffDate = ninetyDaysAgo.toISOString();
    
    // Count total logs
    const totalCount = (db.prepare('SELECT COUNT(*) as count FROM system_logs').get() as { count: number }).count;
    
    // If we have less than 10,000 logs, don't delete anything
    if (totalCount <= 10000) {
      return 0;
    }
    
    // Delete logs older than 90 days, but keep at least 10,000 most recent
    const result = db.prepare(`
      DELETE FROM system_logs
      WHERE created_at < ?
      AND id NOT IN (
        SELECT id FROM system_logs
        ORDER BY created_at DESC
        LIMIT 10000
      )
    `).run(cutoffDate);
    
    const deleted = result.changes || 0;
    
    if (deleted > 0) {
      console.log(`[DB] Cleaned up ${deleted} old log entries`);
    }
    
    return deleted;
  } catch (error) {
    console.error('[DB] Error cleaning up old logs:', error);
    return 0;
  }
}

/**
 * Run all maintenance tasks
 * 
 * Call this periodically (e.g., weekly) to keep the database healthy.
 * 
 * @returns Summary of maintenance actions
 */
export function runMaintenance(): {
  logs_deleted: number;
  timestamp: string;
} {
  const logsDeleted = cleanupOldLogs();
  
  return {
    logs_deleted: logsDeleted,
    timestamp: new Date().toISOString()
  };
}

