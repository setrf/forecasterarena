import { MAX_DAYS, type ExportTable } from '@/lib/application/admin-export/constants';
import { daysBetween, parseDateInput } from '@/lib/application/admin-export/helpers';
import { getRequestedTables } from '@/lib/application/admin-export/queries';
import type { AppResult } from '@/lib/application/admin-export/types';

export type ParsedCreateAdminExportInput = {
  cohortId: string;
  from: Date;
  to: Date;
  tables: ExportTable[];
  includePrompts: boolean;
};

export function parseCreateAdminExportInput(body: unknown): AppResult<ParsedCreateAdminExportInput> {
  const payload = (body && typeof body === 'object') ? body as Record<string, unknown> : {};
  const cohortId = typeof payload.cohort_id === 'string' ? payload.cohort_id : '';
  const fromInput = typeof payload.from === 'string' ? payload.from : '';
  const toInput = typeof payload.to === 'string' ? payload.to : '';
  const includePrompts = payload.include_prompts === true;

  if (!cohortId || !fromInput || !toInput) {
    return { ok: false, status: 400, error: 'cohort_id, from, and to are required' };
  }

  let from: Date;
  let to: Date;
  try {
    from = parseDateInput(fromInput, 'from');
    to = parseDateInput(toInput, 'to');
  } catch (error) {
    return {
      ok: false,
      status: 400,
      error: error instanceof Error ? error.message : 'Invalid dates'
    };
  }

  if (to < from) {
    return { ok: false, status: 400, error: '`to` must be after `from`' };
  }

  if (daysBetween(from, to) > MAX_DAYS) {
    return { ok: false, status: 400, error: `Date range too large (max ${MAX_DAYS} days)` };
  }

  const tables = getRequestedTables(payload.tables);
  if (tables.length === 0) {
    return { ok: false, status: 400, error: 'No valid tables requested' };
  }

  return {
    ok: true,
    data: { cohortId, from, to, tables, includePrompts }
  };
}
