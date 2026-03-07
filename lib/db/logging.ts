import { getDb } from '@/lib/db/connection';
import { generateId } from '@/lib/db/ids';

export function logSystemEvent(
  eventType: string,
  eventData?: Record<string, unknown>,
  severity: 'info' | 'warning' | 'error' = 'info'
): void {
  const database = getDb();

  database.prepare(`
    INSERT INTO system_logs (id, event_type, event_data, severity)
    VALUES (?, ?, ?, ?)
  `).run(
    generateId(),
    eventType,
    eventData ? JSON.stringify(eventData) : null,
    severity
  );
}
