export type AdminSeverityFilter = 'all' | 'info' | 'warning' | 'error';
export type AdminAction = 'start-cohort' | 'sync-markets' | 'check-cohorts' | 'backup';

export type AdminOperationResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

export type AdminActionResult = AdminOperationResult<Record<string, unknown>>;
