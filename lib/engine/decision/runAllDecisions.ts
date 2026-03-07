import { logSystemEvent } from '@/lib/db';
import { getActiveCohorts } from '@/lib/db/queries';
import { runCohortDecisions } from '@/lib/engine/decision/runCohortDecisions';
import type { CohortDecisionResult } from '@/lib/engine/decision/types';

export async function runAllDecisions(): Promise<CohortDecisionResult[]> {
  console.log('Starting weekly decision run...');

  const results: CohortDecisionResult[] = [];
  const activeCohorts = getActiveCohorts();

  if (activeCohorts.length === 0) {
    console.log('No active cohorts found');
    return results;
  }

  console.log(`Processing ${activeCohorts.length} active cohort(s)`);

  for (const cohort of activeCohorts) {
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
