import type { LogEntry, SeverityFilter } from '@/features/admin/logs/types';

interface AdminLogsPayload {
  logs?: LogEntry[];
}

export async function fetchAdminLogsData(
  severity: SeverityFilter
): Promise<LogEntry[]> {
  const params = new URLSearchParams();
  if (severity !== 'all') {
    params.set('severity', severity);
  }
  params.set('limit', '100');

  const response = await fetch(`/api/admin/logs?${params}`);
  if (!response.ok) {
    throw new Error(response.status === 401 ? 'unauthorized' : 'Failed to load admin logs');
  }

  const payload = await response.json() as AdminLogsPayload;
  return payload.logs || [];
}
