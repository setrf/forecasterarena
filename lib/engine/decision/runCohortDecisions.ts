import { getDb, logSystemEvent } from '@/lib/db';
import { getAgentsWithModelsByCohort, getTopMarketsByVolume } from '@/lib/db/queries';
import { TOP_MARKETS_COUNT } from '@/lib/constants';
import { processAgentDecision } from '@/lib/engine/decision/processAgentDecision';
import type { CohortDecisionResult } from '@/lib/engine/decision/types';
import { sleep, calculateWeekNumber } from '@/lib/utils';

export async function runCohortDecisions(cohortId: string): Promise<CohortDecisionResult> {
  const db = getDb();
  const cohort = db.prepare('SELECT * FROM cohorts WHERE id = ?').get(cohortId) as {
    id: string;
    cohort_number: number;
    started_at: string;
  };

  if (!cohort) {
    throw new Error(`Cohort not found: ${cohortId}`);
  }

  const weekNumber = calculateWeekNumber(cohort.started_at);
  console.log(`Running decisions for Cohort #${cohort.cohort_number}, Week ${weekNumber}`);

  const result: CohortDecisionResult = {
    cohort_id: cohortId,
    cohort_number: cohort.cohort_number,
    week_number: weekNumber,
    agents_processed: 0,
    decisions: [],
    errors: []
  };

  const agents = getAgentsWithModelsByCohort(cohortId);
  const markets = getTopMarketsByVolume(TOP_MARKETS_COUNT);

  for (const agent of agents) {
    try {
      const decisionResult = await processAgentDecision(agent, cohortId, weekNumber, markets);
      result.decisions.push(decisionResult);
      result.agents_processed += 1;

      if (!decisionResult.success && decisionResult.error) {
        result.errors.push(`${agent.model.display_name}: ${decisionResult.error}`);
      }

      await sleep(1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`${agent.model?.display_name}: ${message}`);
    }
  }

  logSystemEvent('cohort_decisions_complete', {
    cohort_id: cohortId,
    cohort_number: cohort.cohort_number,
    week_number: weekNumber,
    agents_processed: result.agents_processed,
    errors: result.errors.length
  });

  return result;
}
