import { logSystemEvent } from '@/lib/db';
import { DECISION_COHORT_LIMIT } from '@/lib/constants';
import { maybeStartNewCohort } from '@/lib/engine/cohort';
import { runAllDecisions } from '@/lib/engine/decision';
import { getActiveCohorts, getDecisionEligibleCohorts } from '@/lib/db/queries';
import { errorMessage, failure, ok, type CronAppResult } from '@/lib/application/cron/types';

type RunDecisionsSuccess = {
  success: true;
  cohort_bootstrap: {
    cohort_id?: string;
    cohort_number?: number;
  } | null;
  decision_cohort_limit: number;
  tracking_active_cohorts: number;
  decision_eligible_cohorts: number;
  cohorts_processed: number;
  total_agents: number;
  total_errors: number;
  duration_ms: number;
  results: Awaited<ReturnType<typeof runAllDecisions>>;
};

function pluralize(count: number, singular: string, plural: string = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function decisionRunFailureMessage(args: {
  cohortsProcessed: number;
  totalAgents: number;
  totalErrors: number;
  firstError?: string;
}): string {
  const summary =
    `Decision run failed for all ${args.totalAgents} processed ${pluralize(args.totalAgents, 'agent')} ` +
    `across ${args.cohortsProcessed} decision ${pluralize(args.cohortsProcessed, 'cohort')} ` +
    `with ${args.totalErrors} ${pluralize(args.totalErrors, 'error')}`;

  return args.firstError ? `${summary}. First error: ${args.firstError}` : summary;
}

export async function runDecisions(): Promise<CronAppResult<RunDecisionsSuccess>> {
  try {
    console.log('Starting weekly decision run...');

    const startTime = Date.now();
    const cohortBootstrap = maybeStartNewCohort(false);
    const trackingActiveCohorts = getActiveCohorts().length;
    const decisionEligibleCohorts = getDecisionEligibleCohorts(DECISION_COHORT_LIMIT).length;
    const results = await runAllDecisions(DECISION_COHORT_LIMIT);
    const duration = Date.now() - startTime;
    const totalAgents = results.reduce((sum, result) => sum + result.agents_processed, 0);
    const totalErrors = results.reduce((sum, result) => sum + result.errors.length, 0);
    const successfulAgents = results.reduce(
      (sum, result) => sum + result.decisions.filter((decision) => decision.success).length,
      0
    );
    const summary = {
      cohorts_processed: results.length,
      decision_cohort_limit: DECISION_COHORT_LIMIT,
      tracking_active_cohorts: trackingActiveCohorts,
      decision_eligible_cohorts: decisionEligibleCohorts,
      total_agents: totalAgents,
      total_errors: totalErrors,
      successful_agents: successfulAgents,
      duration_ms: duration
    };

    logSystemEvent('decisions_run_complete', summary);

    console.log(
      `Decision run complete: ${results.length} cohorts, ${totalAgents} agents, ${totalErrors} errors, ${duration}ms`
    );

    if (totalAgents > 0 && totalErrors >= totalAgents && successfulAgents === 0) {
      const sampleErrors = results.flatMap((result) => result.errors).slice(0, 5);
      const message = decisionRunFailureMessage({
        cohortsProcessed: results.length,
        totalAgents,
        totalErrors,
        firstError: sampleErrors[0]
      });

      logSystemEvent('decisions_run_failed', {
        ...summary,
        error: message,
        sample_errors: sampleErrors
      }, 'error');
      console.error(message);

      return failure(502, message);
    }

    return ok({
      success: true,
      cohort_bootstrap: cohortBootstrap.success
        ? {
            cohort_id: cohortBootstrap.cohort?.id,
            cohort_number: cohortBootstrap.cohort?.cohort_number
          }
        : null,
      decision_cohort_limit: DECISION_COHORT_LIMIT,
      tracking_active_cohorts: trackingActiveCohorts,
      decision_eligible_cohorts: decisionEligibleCohorts,
      cohorts_processed: results.length,
      total_agents: totalAgents,
      total_errors: totalErrors,
      duration_ms: duration,
      results
    });
  } catch (error) {
    const message = errorMessage(error);
    logSystemEvent('decisions_run_error', { error: message }, 'error');
    return failure(500, message);
  }
}
