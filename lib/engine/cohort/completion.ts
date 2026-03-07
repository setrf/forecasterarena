import { logSystemEvent } from '@/lib/db';
import {
  completeCohort,
  getActiveCohorts,
  getCohortCompletionStatus
} from '@/lib/db/queries';

export function isCohortComplete(cohortId: string): boolean {
  const status = getCohortCompletionStatus(cohortId);

  if (status.total_decisions === 0) {
    return false;
  }

  return status.open_positions === 0;
}

export function checkAndCompleteCohorts(): number {
  const activeCohorts = getActiveCohorts();
  let completedCount = 0;

  for (const cohort of activeCohorts) {
    if (isCohortComplete(cohort.id)) {
      completeCohort(cohort.id);
      completedCount++;

      logSystemEvent('cohort_completed', {
        cohort_id: cohort.id,
        cohort_number: cohort.cohort_number
      });

      console.log(`Cohort #${cohort.cohort_number} completed`);
    }
  }

  return completedCount;
}
