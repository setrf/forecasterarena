import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { EXPORTS_DIR } from '@/lib/application/admin-export/constants';

export function parseDateInput(input: string, label: string): Date {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label} date`);
  }

  return date;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.abs(to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
}

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const rawValue = String(value);
  const stringValue = /^[=+\-@\t\r]/.test(rawValue) ? `'${rawValue}` : rawValue;
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function writeCsv(
  filePath: string,
  columns: string[],
  rows: Record<string, unknown>[]
): void {
  const lines = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))
  ];
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

export function cleanupOldExports(): void {
  try {
    if (!fs.existsSync(EXPORTS_DIR)) {
      return;
    }

    const files = fs.readdirSync(EXPORTS_DIR)
      .filter((file) => file.endsWith('.zip'))
      .map((file) => {
        const filePath = path.join(EXPORTS_DIR, file);
        return {
          path: filePath,
          mtime: fs.statSync(filePath).mtime
        };
      });

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    files.forEach((file) => {
      if (file.mtime.getTime() < cutoff) {
        fs.unlinkSync(file.path);
      }
    });
  } catch (error) {
    console.warn('[Export] cleanup failed', error);
  }
}

export function safeFilename(cohortId: string): string {
  const safeCohortId = cohortId
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'cohort';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `export-${safeCohortId}-${timestamp}.zip`;
}

export function createZipArchive(zipPath: string, files: string[]): void {
  const result = spawnSync('zip', ['-j', zipPath, ...files], {
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || 'Failed to create export archive');
  }
}

export function cleanupTempDir(tempDir: string): void {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
