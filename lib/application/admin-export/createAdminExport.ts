import fs from 'fs';
import os from 'os';
import path from 'path';
import { logSystemEvent } from '@/lib/db';
import { EXPORTS_DIR } from '@/lib/application/admin-export/constants';
import { createAdminExportArchive } from '@/lib/application/admin-export/createAdminExportArchive';
import { parseCreateAdminExportInput } from '@/lib/application/admin-export/createAdminExportInput';
import {
  cleanupOldExports,
  cleanupTempDir
} from '@/lib/application/admin-export/helpers';
import { buildQueries } from '@/lib/application/admin-export/queries';
import type { AppResult, CreateAdminExportSuccess } from '@/lib/application/admin-export/types';

export function createAdminExport(body: unknown): AppResult<CreateAdminExportSuccess> {
  const parsed = parseCreateAdminExportInput(body);
  if (!parsed.ok) {
    return parsed;
  }

  const { cohortId, from, to, tables, includePrompts } = parsed.data;
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  cleanupOldExports();

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fa-export-'));
  const isoFrom = from.toISOString();
  const isoTo = to.toISOString();

  try {
    const queries = buildQueries(includePrompts);
    const { filename } = createAdminExportArchive({
      tempDir,
      queries,
      cohortId,
      isoFrom,
      isoTo,
      tables,
      includePrompts
    });

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
