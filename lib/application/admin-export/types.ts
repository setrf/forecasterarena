import type { ExportTable } from '@/lib/application/admin-export/constants';

export type ExportQuery = {
  columns: string[];
  sql: string;
};

export type ExportQueries = Record<ExportTable, ExportQuery>;

export type AdminExportInfo = {
  cohort_id: string;
  from: string;
  to: string;
  tables: ExportTable[];
  include_prompts: boolean;
};

export type CreateAdminExportSuccess = {
  download_url: string;
  info: AdminExportInfo;
};

export type DownloadAdminExportSuccess = {
  filePath: string;
  filename: string;
};

export type ReadAdminExportDownloadSuccess = {
  filename: string;
  fileData: ArrayBuffer;
};

export type AppResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };
