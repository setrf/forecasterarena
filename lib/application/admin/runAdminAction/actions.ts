import { createBackup, logSystemEvent } from '@/lib/db';
import { maybeStartNewCohort, checkAndCompleteCohorts } from '@/lib/engine/cohort';
import { syncMarkets } from '@/lib/engine/market';
import type { AdminActionResult } from '@/lib/application/admin/types';

export function runStartCohortAction(force: boolean): AdminActionResult {
  const result = maybeStartNewCohort(force);

  if (result.success && result.cohort) {
    logSystemEvent('admin_start_cohort', {
      cohort_number: result.cohort.cohort_number,
      agents_created: result.agents?.length || 0
    }, 'info');

    return {
      ok: true,
      data: {
        success: true,
        cohort_id: result.cohort.id,
        cohort_number: result.cohort.cohort_number,
        agents_created: result.agents?.length || 0
      }
    };
  }

  return {
    ok: true,
    data: {
      success: false,
      message: result.error || 'Conditions not met for new cohort'
    }
  };
}

export async function runSyncMarketsAction(): Promise<AdminActionResult> {
  const result = await syncMarkets();
  logSystemEvent('admin_sync_markets', {
    markets_added: result.markets_added,
    markets_updated: result.markets_updated
  }, 'info');

  return {
    ok: true,
    data: {
      success: true,
      markets_added: result.markets_added,
      markets_updated: result.markets_updated
    }
  };
}

export function runCheckCohortsAction(): AdminActionResult {
  const completedCount = checkAndCompleteCohorts();
  logSystemEvent('admin_check_cohorts', {
    cohorts_checked: completedCount
  }, 'info');

  return {
    ok: true,
    data: {
      success: true,
      cohorts_completed: completedCount
    }
  };
}

export async function runBackupAction(): Promise<AdminActionResult> {
  const backupPath = await createBackup();
  logSystemEvent('admin_backup', { backup_path: backupPath }, 'info');

  return {
    ok: true,
    data: {
      success: true,
      backup_path: backupPath
    }
  };
}
