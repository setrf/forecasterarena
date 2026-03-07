import { createBackup, logSystemEvent } from '@/lib/db';
import { errorMessage, failure, ok, type CronAppResult } from '@/lib/application/cron/types';

type BackupSuccess = {
  success: true;
  backup_path: string;
  duration_ms: number;
};

export function createDatabaseBackup(): CronAppResult<BackupSuccess> {
  try {
    console.log('Creating database backup...');

    const startTime = Date.now();
    const backupPath = createBackup();
    const duration = Date.now() - startTime;

    logSystemEvent('backup_created', {
      path: backupPath,
      duration_ms: duration
    });

    console.log(`Backup created: ${backupPath}`);

    return ok({
      success: true,
      backup_path: backupPath,
      duration_ms: duration
    });
  } catch (error) {
    const message = errorMessage(error);
    logSystemEvent('backup_error', { error: message }, 'error');
    return failure(500, message);
  }
}
