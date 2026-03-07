export interface LogEntry {
  id: string;
  event_type: string;
  event_data: string | null;
  severity: string;
  created_at: string;
}

export type SeverityFilter = 'all' | 'info' | 'warning' | 'error';
