import { logSystemEvent } from '@/lib/db';
import { maybeStartNewCohort } from '@/lib/engine/cohort';
import { errorMessage, failure, ok, type CronAppResult } from '@/lib/application/cron/types';

type StartCohortSuccess =
  | {
      success: true;
      cohort_id: string;
      cohort_number: number;
      agents_created: number;
    }
  | {
      success: false;
      message: string;
    };

export function startCohort(force: boolean): CronAppResult<StartCohortSuccess> {
  try {
    console.log('Checking if new cohort should start...');

    const result = maybeStartNewCohort(force);

    if (result.success && result.cohort) {
      console.log(`Started Cohort #${result.cohort.cohort_number}`);

      return ok({
        success: true,
        cohort_id: result.cohort.id,
        cohort_number: result.cohort.cohort_number,
        agents_created: result.agents?.length || 0
      });
    }

    console.log('No new cohort started:', result.error);
    return ok({
      success: false,
      message: result.error || 'Conditions not met for new cohort'
    });
  } catch (error) {
    const message = errorMessage(error);
    logSystemEvent('start_cohort_error', { error: message }, 'error');
    console.error('Start cohort error:', error);
    return failure(500, message);
  }
}
