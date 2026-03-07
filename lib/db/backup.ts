import fs from 'fs';
import path from 'path';

import { getDb } from '@/lib/db/connection';
import { BACKUP_PATH } from '@/lib/db/runtime';

export function createBackup(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `forecaster-${timestamp}.db`;
  const backupPath = path.join(BACKUP_PATH, backupFilename);

  const database = getDb();
  database.backup(backupPath);

  console.log(`[DB] Backup created: ${backupPath}`);

  cleanupOldBackups();

  return backupPath;
}

function cleanupOldBackups(): void {
  try {
    if (!fs.existsSync(BACKUP_PATH)) {
      return;
    }

    const files = fs.readdirSync(BACKUP_PATH)
      .filter(file => file.startsWith('forecaster-') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_PATH, file),
        mtime: fs.statSync(path.join(BACKUP_PATH, file)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (files.length <= 10) {
      return;
    }

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (let index = 10; index < files.length; index++) {
      const file = files[index];
      if (file.mtime.getTime() < thirtyDaysAgo) {
        fs.unlinkSync(file.path);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`[DB] Cleaned up ${deletedCount} old backup(s)`);
    }
  } catch (error) {
    console.error('[DB] Error cleaning up old backups:', error);
  }
}
