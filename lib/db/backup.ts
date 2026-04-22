import fs from 'fs';
import path from 'path';

import { DEFAULT_BACKUP_RETENTION_COUNT } from '@/lib/constants';
import { getDb } from '@/lib/db/connection';
import { BACKUP_PATH } from '@/lib/db/runtime';

const STALE_BACKUP_JOURNAL_AGE_MS = 60 * 60 * 1000;

export async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `forecaster-${timestamp}.db`;
  const backupPath = path.join(BACKUP_PATH, backupFilename);

  const database = getDb();
  await database.backup(backupPath);

  console.log(`[DB] Backup created: ${backupPath}`);

  cleanupOldBackups();

  return backupPath;
}

function cleanupOldBackups(): void {
  try {
    if (!fs.existsSync(BACKUP_PATH)) {
      return;
    }

    const retentionCount = getBackupRetentionCount();
    const files = fs.readdirSync(BACKUP_PATH)
      .filter(file => file.startsWith('forecaster-') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_PATH, file),
        mtime: fs.statSync(path.join(BACKUP_PATH, file)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    let deletedCount = 0;

    for (let index = retentionCount; index < files.length; index++) {
      const file = files[index];
      fs.unlinkSync(file.path);
      deletedCount++;
    }

    deletedCount += cleanupStaleBackupJournals();

    if (deletedCount > 0) {
      console.log(`[DB] Cleaned up ${deletedCount} old backup(s)`);
    }
  } catch (error) {
    console.error('[DB] Error cleaning up old backups:', error);
  }
}

function cleanupStaleBackupJournals(): number {
  const cutoff = Date.now() - STALE_BACKUP_JOURNAL_AGE_MS;
  let deletedCount = 0;

  for (const file of fs.readdirSync(BACKUP_PATH)) {
    if (!file.startsWith('forecaster-') || !file.endsWith('.db-journal')) {
      continue;
    }

    const filePath = path.join(BACKUP_PATH, file);
    const stats = fs.statSync(filePath);
    if (stats.mtime.getTime() > cutoff) {
      continue;
    }

    fs.unlinkSync(filePath);
    deletedCount++;
  }

  return deletedCount;
}

function getBackupRetentionCount(): number {
  const rawValue = process.env.BACKUP_RETENTION_COUNT;
  if (!rawValue) {
    return DEFAULT_BACKUP_RETENTION_COUNT;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return DEFAULT_BACKUP_RETENTION_COUNT;
  }

  return parsedValue;
}
