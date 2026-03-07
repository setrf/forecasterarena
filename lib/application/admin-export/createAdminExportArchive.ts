import fs from 'fs';
import path from 'path';
import { EXPORTS_DIR, MAX_ROWS, type ExportTable } from '@/lib/application/admin-export/constants';
import { createAdminExportReadme } from '@/lib/application/admin-export/createAdminExportReadme';
import { createZipArchive, safeFilename, writeCsv } from '@/lib/application/admin-export/helpers';
import { getRowsForTable } from '@/lib/application/admin-export/queries';
import type { ExportQueries } from '@/lib/application/admin-export/types';

type CreateAdminExportArchiveInput = {
  tempDir: string;
  queries: ExportQueries;
  cohortId: string;
  isoFrom: string;
  isoTo: string;
  tables: ExportTable[];
  includePrompts: boolean;
};

export function createAdminExportArchive(input: CreateAdminExportArchiveInput): { filename: string } {
  const {
    tempDir,
    queries,
    cohortId,
    isoFrom,
    isoTo,
    tables,
    includePrompts
  } = input;

  tables.forEach((table) => {
    const rows = getRowsForTable(queries, table, cohortId, isoFrom, isoTo);
    if (rows.length > MAX_ROWS) {
      throw new Error(`${table} exceeds row cap (${MAX_ROWS}). Narrow the window.`);
    }

    writeCsv(path.join(tempDir, `${table}.csv`), queries[table].columns, rows);
  });

  fs.writeFileSync(
    path.join(tempDir, 'README.txt'),
    createAdminExportReadme({ cohortId, isoFrom, isoTo, tables, includePrompts }),
    'utf8'
  );

  const filename = path.basename(safeFilename(cohortId));
  const zipPath = path.join(EXPORTS_DIR, filename);
  const filesToZip = fs.readdirSync(tempDir).map((file) => path.join(tempDir, file));

  createZipArchive(zipPath, filesToZip);

  return { filename };
}
