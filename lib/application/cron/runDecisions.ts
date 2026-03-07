import { logSystemEvent } from '@/lib/db';
import { maybeStartNewCohort } from '@/lib/engine/cohort';
import { runAllDecisions } from '@/lib/engine/decision';
import { errorMessage, failure, ok, type CronAppResult } from '@/lib/application/cron/types';

type RunDecisionsSuccess = {
  success: true;
  cohort_bootstrap: {
    cohort_id?: string;
    cohort_number?: number;
  } | null;
  cohorts_processed: number;
  total_agents: number;
  total_errors: number;
  duration_ms: number;
  results: Awaited<ReturnType<typeof runAllDecisions>>;
};

export async function runDecisions(): Promise<CronAppResult<RunDecisionsSuccess>> {
  try {
    console.log('Starting weekly decision run...');

    const startTime = Date.now();
    const cohortBootstrap = maybeStartNewCohort(false);
    const results = await runAllDecisions();
    const duration = Date.now() - startTime;
    const totalAgents = results.reduce((sum, result) => sum + result.agents_processed, 0);
    const totalErrors = results.reduce((sum, result) => sum + result.errors.length, 0);

    logSystemEvent('decisions_run_complete', {
      cohorts_processed: results.length,
      total_agents: totalAgents,
      total_errors: totalErrors,
      duration_ms: duration
    });

    console.log(
      `Decision run complete: ${results.length} cohorts, ${totalAgents} agents, ${totalErrors} errors, ${duration}ms`
    );

    return ok({
      success: true,
      cohort_bootstrap: cohortBootstrap.success
        ? {
            cohort_id: cohortBootstrap.cohort?.id,
            cohort_number: cohortBootstrap.cohort?.cohort_number
          }
        : null,
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
