import { createBackup, logSystemEvent } from '@/lib/db';
import { maybeStartNewCohort, checkAndCompleteCohorts } from '@/lib/engine/cohort';
import { syncMarkets } from '@/lib/engine/market';
import type { AdminAction, AdminActionResult } from '@/lib/application/admin/types';

function runStartCohortAction(force: boolean): AdminActionResult {
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

async function runSyncMarketsAction(): Promise<AdminActionResult> {
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

function runCheckCohortsAction(): AdminActionResult {
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

function runBackupAction(): AdminActionResult {
  const backupPath = createBackup();
  logSystemEvent('admin_backup', { backup_path: backupPath }, 'info');

  return {
    ok: true,
    data: {
      success: true,
      backup_path: backupPath
    }
  };
}

async function executeAdminAction(action: AdminAction | string, force: boolean): Promise<AdminActionResult> {
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

export async function runAdminAction(action: string, force: boolean): Promise<AdminActionResult> {
  try {
    return await executeAdminAction(action, force);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logSystemEvent('admin_action_error', { error: message }, 'error');
    return { ok: false, status: 500, error: message };
  }
}
