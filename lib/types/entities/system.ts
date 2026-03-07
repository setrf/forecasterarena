export interface SystemLog {
  id: string;
  event_type: string;
  event_data: string | null;
  severity: 'info' | 'warning' | 'error';
  created_at: string;
}
