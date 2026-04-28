import { logSystemEvent } from '@/lib/db';
import { DECISION_COHORT_LIMIT } from '@/lib/constants';
import { getDecisionEligibleCohorts } from '@/lib/db/queries';
import { runCohortDecisions } from '@/lib/engine/decision/runCohortDecisions';
import type { CohortDecisionResult } from '@/lib/engine/decision/types';

export async function runAllDecisions(
  decisionCohortLimit: number = DECISION_COHORT_LIMIT
): Promise<CohortDecisionResult[]> {
  console.log('Starting weekly decision run...');

  const results: CohortDecisionResult[] = [];
  const decisionCohorts = getDecisionEligibleCohorts(decisionCohortLimit);

  if (decisionCohorts.length === 0) {
    console.log('No decision-eligible cohorts found');
    return results;
  }

  console.log(
    `Processing ${decisionCohorts.length} decision-eligible cohort(s) within latest ${decisionCohortLimit}`
  );

  for (const cohort of decisionCohorts) {
    try {
      results.push(await runCohortDecisions(cohort.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error processing cohort ${cohort.cohort_number}:`, message);

      logSystemEvent('cohort_decisions_error', {
        cohort_id: cohort.id,
        error: message
      }, 'error');
    }
  }

  console.log('Weekly decision run complete');
  return results;
}
