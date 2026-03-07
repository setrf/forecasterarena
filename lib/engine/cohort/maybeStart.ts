import { getAgentsByCohort, getCohortForCurrentWeek } from '@/lib/db/queries';
import { shouldStartNewCohort } from '@/lib/engine/cohort/schedule';
import { startNewCohort } from '@/lib/engine/cohort/start';
import type { StartCohortResult } from '@/lib/engine/cohort/types';

export function maybeStartNewCohort(force: boolean = false): StartCohortResult {
  const existingCohort = getCohortForCurrentWeek();
  if (existingCohort) {
    console.log(`Cohort #${existingCohort.cohort_number} already exists for this week`);
    const agents = getAgentsByCohort(existingCohort.id);
    return {
      success: true,
      cohort: existingCohort,
      agents
    };
  }

  if (!force && !shouldStartNewCohort()) {
    return {
      success: false,
      error: 'Not Sunday or outside start window'
    };
  }

  return startNewCohort();
}
