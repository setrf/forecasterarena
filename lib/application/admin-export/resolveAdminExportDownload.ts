import fs from 'fs';
import path from 'path';
import { EXPORTS_DIR } from '@/lib/application/admin-export/constants';
import type { AppResult, DownloadAdminExportSuccess } from '@/lib/application/admin-export/types';

export function resolveAdminExportDownload(file: string | null): AppResult<DownloadAdminExportSuccess> {
  if (!file) {
    return { ok: false, status: 400, error: 'file query param required' };
  }

  const filename = path.basename(file);
  const filePath = path.join(EXPORTS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return { ok: false, status: 404, error: 'Not found' };
  }

  return {
    ok: true,
    data: { filePath, filename }
  };
}
