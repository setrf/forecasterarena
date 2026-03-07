import { logSystemEvent } from '@/lib/db';
import { checkAndCompleteCohorts } from '@/lib/engine/cohort';
import { checkAllResolutions } from '@/lib/engine/resolution';
import { errorMessage, failure, ok, type CronAppResult } from '@/lib/application/cron/types';

type CheckResolutionsSuccess = {
  success: true;
  markets_checked: number;
  markets_resolved: number;
  positions_settled: number;
  cohorts_completed: number;
  errors: number;
  duration_ms: number;
};

export async function checkResolutions(): Promise<CronAppResult<CheckResolutionsSuccess>> {
  try {
    console.log('Checking for market resolutions...');

    const startTime = Date.now();
    const result = await checkAllResolutions();
    const cohortsCompleted = checkAndCompleteCohorts();
    const duration = Date.now() - startTime;

    console.log(
      `Resolution check complete: ${result.markets_resolved} resolved, ${cohortsCompleted} cohorts completed`
    );

    return ok({
      success: true,
      markets_checked: result.markets_checked,
      markets_resolved: result.markets_resolved,
      positions_settled: result.positions_settled,
      cohorts_completed: cohortsCompleted,
      errors: result.errors.length,
      duration_ms: duration
    });
  } catch (error) {
    const message = errorMessage(error);
    logSystemEvent('check_resolutions_error', { error: message }, 'error');
    return failure(500, message);
  }
}
