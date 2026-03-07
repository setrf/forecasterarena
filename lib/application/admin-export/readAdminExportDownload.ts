import fs from 'fs';
import { resolveAdminExportDownload } from '@/lib/application/admin-export/resolveAdminExportDownload';
import type { AppResult, ReadAdminExportDownloadSuccess } from '@/lib/application/admin-export/types';

export function readAdminExportDownload(file: string | null): AppResult<ReadAdminExportDownloadSuccess> {
  const resolved = resolveAdminExportDownload(file);
  if (!resolved.ok) {
    return resolved;
  }

  const bytes = fs.readFileSync(resolved.data.filePath);
  const fileData = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(fileData).set(bytes);

  return {
    ok: true,
    data: {
      filename: resolved.data.filename,
      fileData
    }
  };
}
