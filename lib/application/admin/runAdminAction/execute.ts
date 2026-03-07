import type { AdminAction, AdminActionResult } from '@/lib/application/admin/types';
import {
  runBackupAction,
  runCheckCohortsAction,
  runStartCohortAction,
  runSyncMarketsAction
} from '@/lib/application/admin/runAdminAction/actions';

export async function executeAdminAction(
  action: AdminAction | string,
  force: boolean
): Promise<AdminActionResult> {
  switch (action) {
    case 'start-cohort':
      return runStartCohortAction(force);
    case 'sync-markets':
      return runSyncMarketsAction();
    case 'check-cohorts':
      return runCheckCohortsAction();
    case 'backup':
      return runBackupAction();
    default:
      return { ok: false, status: 400, error: 'Unknown action' };
  }
}
