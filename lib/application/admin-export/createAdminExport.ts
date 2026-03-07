import fs from 'fs';
import os from 'os';
import path from 'path';
import { logSystemEvent } from '@/lib/db';
import { EXPORTS_DIR, MAX_DAYS, MAX_ROWS, type ExportTable } from '@/lib/application/admin-export/constants';
import {
  cleanupOldExports,
  cleanupTempDir,
  createZipArchive,
  daysBetween,
  parseDateInput,
  safeFilename,
  writeCsv
} from '@/lib/application/admin-export/helpers';
import { buildQueries, getRequestedTables, getRowsForTable } from '@/lib/application/admin-export/queries';
import type { AppResult, CreateAdminExportSuccess } from '@/lib/application/admin-export/types';

type CreateExportInput =
  | { ok: false; status: number; error: string }
  | {
      ok: true;
      data: {
        cohortId: string;
        from: Date;
        to: Date;
        tables: ExportTable[];
        includePrompts: boolean;
      };
    };

function parseCreateExportInput(body: unknown): CreateExportInput {
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

function createReadme(
  cohortId: string,
  isoFrom: string,
  isoTo: string,
  tables: ExportTable[],
  includePrompts: boolean
): string {
  return [
    'Forecaster Arena Export',
    `Generated at: ${new Date().toISOString()}`,
    `Cohort: ${cohortId}`,
    `Range: ${isoFrom} .. ${isoTo}`,
    `Tables: ${tables.join(', ')}`,
    `Include prompts: ${includePrompts}`,
    `Schema version: ${process.env.SCHEMA_VERSION || 'unknown'}`,
    `Methodology version: ${process.env.METHODOLOGY_VERSION || 'v1'}`,
    '',
    'This export is capped to keep the server healthy (max 7 days, 50k rows per table).'
  ].join('\n');
}

export function createAdminExport(body: unknown): AppResult<CreateAdminExportSuccess> {
  const parsed = parseCreateExportInput(body);
  if (!parsed.ok) {
    return parsed;
  }

  const { cohortId, from, to, tables, includePrompts } = parsed.data;
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  cleanupOldExports();

  const queries = buildQueries(includePrompts);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fa-export-'));
  const isoFrom = from.toISOString();
  const isoTo = to.toISOString();

  try {
    tables.forEach((table) => {
      const rows = getRowsForTable(queries, table, cohortId, isoFrom, isoTo);
      if (rows.length > MAX_ROWS) {
        throw new Error(`${table} exceeds row cap (${MAX_ROWS}). Narrow the window.`);
      }

      writeCsv(path.join(tempDir, `${table}.csv`), queries[table].columns, rows);
    });

    fs.writeFileSync(
      path.join(tempDir, 'README.txt'),
      createReadme(cohortId, isoFrom, isoTo, tables, includePrompts),
      'utf8'
    );

    const filename = path.basename(safeFilename(cohortId));
    const zipPath = path.join(EXPORTS_DIR, filename);
    const filesToZip = fs.readdirSync(tempDir).map((file) => path.join(tempDir, file));

    createZipArchive(zipPath, filesToZip);
    logSystemEvent('admin_export_created', {
      cohort_id: cohortId,
      tables,
      from: isoFrom,
      to: isoTo,
      include_prompts: includePrompts,
      file: filename
    }, 'info');

    return {
      ok: true,
      data: {
        download_url: `/api/admin/export?file=${encodeURIComponent(filename)}`,
        info: {
          cohort_id: cohortId,
          from: isoFrom,
          to: isoTo,
          tables,
          include_prompts: includePrompts
        }
      }
    };
  } catch (error) {
    console.error('[Export] failed', error);
    const message = error instanceof Error ? error.message : 'Export failed';
    const status = message.includes('row cap') ? 400 : 500;
    return { ok: false, status, error: message };
  } finally {
    cleanupTempDir(tempDir);
  }
}
