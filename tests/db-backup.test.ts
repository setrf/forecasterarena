import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, expect, it, vi } from 'vitest';

function makeTempBackupDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'forecaster-backups-'));
}

function writeFileWithMtime(filePath: string, content: string, mtime: Date) {
  fs.writeFileSync(filePath, content);
  fs.utimesSync(filePath, mtime, mtime);
}

describe('database backup', () => {
  it('awaits backup completion before returning and prunes old backup artifacts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-22T02:00:01.123Z'));
    vi.stubEnv('BACKUP_RETENTION_COUNT', '2');

    const backupDir = makeTempBackupDir();
    const staleJournalPath = path.join(backupDir, 'forecaster-2026-04-01T02-00-00-000Z.db-journal');
    const freshJournalPath = path.join(backupDir, 'forecaster-2026-04-22T01-45-00-000Z.db-journal');

    writeFileWithMtime(
      path.join(backupDir, 'forecaster-2026-04-18T02-00-00-000Z.db'),
      'oldest',
      new Date('2026-04-18T02:00:00.000Z')
    );
    writeFileWithMtime(
      path.join(backupDir, 'forecaster-2026-04-20T02-00-00-000Z.db'),
      'middle',
      new Date('2026-04-20T02:00:00.000Z')
    );
    writeFileWithMtime(
      path.join(backupDir, 'forecaster-2026-04-21T02-00-00-000Z.db'),
      'newer',
      new Date('2026-04-21T02:00:00.000Z')
    );
    writeFileWithMtime(staleJournalPath, 'stale', new Date('2026-04-21T00:00:00.000Z'));
    writeFileWithMtime(freshJournalPath, 'fresh', new Date('2026-04-22T01:45:00.000Z'));

    const backup = vi.fn((destination: string) => new Promise<void>((resolve) => {
      setTimeout(() => {
        fs.writeFileSync(destination, 'created');
        resolve();
      }, 10);
    }));

    vi.doMock('@/lib/db/runtime', () => ({
      BACKUP_PATH: backupDir
    }));
    vi.doMock('@/lib/db/connection', () => ({
      getDb: () => ({ backup })
    }));

    const { createBackup } = await import('@/lib/db/backup');
    const backupPromise = createBackup();

    await vi.advanceTimersByTimeAsync(10);
    const backupPath = await backupPromise;

    expect(backup).toHaveBeenCalledWith(backupPath);
    expect(fs.readFileSync(backupPath, 'utf8')).toBe('created');

    const remainingBackups = fs.readdirSync(backupDir)
      .filter((file) => file.endsWith('.db'))
      .sort();

    expect(remainingBackups).toHaveLength(2);
    expect(remainingBackups).toContain(path.basename(backupPath));
    expect(remainingBackups).not.toContain('forecaster-2026-04-18T02-00-00-000Z.db');
    expect(fs.existsSync(staleJournalPath)).toBe(false);
    expect(fs.existsSync(freshJournalPath)).toBe(true);
  });
});
