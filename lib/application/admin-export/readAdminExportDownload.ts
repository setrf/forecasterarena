import fs from 'fs';
import { resolveAdminExportDownload } from '@/lib/application/admin-export/resolveAdminExportDownload';
import type { AppResult, ReadAdminExportDownloadSuccess } from '@/lib/application/admin-export/types';

export function readAdminExportDownload(file: string | null): AppResult<ReadAdminExportDownloadSuccess> {
  const resolved = resolveAdminExportDownload(file);
  if (!resolved.ok) {
    return resolved;
  }

  return {
    ok: true,
    data: {
      filename: resolved.data.filename,
      fileData: fs.readFileSync(resolved.data.filePath)
    }
  };
}
