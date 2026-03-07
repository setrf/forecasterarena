export type AdminSeverityFilter = 'all' | 'info' | 'warning' | 'error';
export type AdminAction = 'start-cohort' | 'sync-markets' | 'check-cohorts' | 'backup';

export type AdminActionResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string };
