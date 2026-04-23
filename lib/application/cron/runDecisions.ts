import { getDb, logSystemEvent, withImmediateTransaction } from '@/lib/db';
import { maybeStartNewCohort } from '@/lib/engine/cohort';
import { runAllDecisions } from '@/lib/engine/decision';
import {
  getActiveCohorts,
  getBenchmarkConfigModels,
  getDefaultBenchmarkConfig
} from '@/lib/db/queries';
import { errorMessage, failure, ok, type CronAppResult } from '@/lib/application/cron/types';

type LineupRefreshSummary = {
  default_config_id: string;
  cohorts_updated: number;
  agents_updated: number;
};

type RunDecisionsSuccess = {
  success: true;
  cohort_bootstrap: {
    cohort_id?: string;
    cohort_number?: number;
  } | null;
  lineup_refresh: LineupRefreshSummary;
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
    `Decision run failed for all ${args.totalAgents} ${pluralize(args.totalAgents, 'agent')} ` +
    `across ${args.cohortsProcessed} ${pluralize(args.cohortsProcessed, 'cohort')} ` +
    `with ${args.totalErrors} ${pluralize(args.totalErrors, 'error')}`;

  return args.firstError ? `${summary}. First error: ${args.firstError}` : summary;
}

function refreshActiveCohortsToDefaultBenchmarkConfig(): LineupRefreshSummary {
  const benchmarkConfig = getDefaultBenchmarkConfig();
  if (!benchmarkConfig) {
    throw new Error('No default benchmark config is configured for active cohort refresh');
  }

  const configModels = getBenchmarkConfigModels(benchmarkConfig.id);
  const configModelsByFamily = new Map(configModels.map((model) => [model.family_id, model] as const));

  return withImmediateTransaction(() => {
    const db = getDb();
    const activeCohorts = getActiveCohorts();
    const updateCohort = db.prepare(`
      UPDATE cohorts
      SET benchmark_config_id = ?
      WHERE id = ?
    `);
    const updateAgent = db.prepare(`
      UPDATE agents
      SET release_id = ?, benchmark_config_model_id = ?
      WHERE id = ?
    `);
    const selectAgents = db.prepare(`
      SELECT id, family_id, release_id, benchmark_config_model_id
      FROM agents
      WHERE cohort_id = ?
    `);

    let cohortsUpdated = 0;
    let agentsUpdated = 0;

    for (const cohort of activeCohorts) {
      let changed = false;

      if (cohort.benchmark_config_id !== benchmarkConfig.id) {
        updateCohort.run(benchmarkConfig.id, cohort.id);
        changed = true;
      }

      const agents = selectAgents.all(cohort.id) as Array<{
        id: string;
        family_id: string;
        release_id: string;
        benchmark_config_model_id: string;
      }>;

      for (const agent of agents) {
        const target = configModelsByFamily.get(agent.family_id);
        if (!target) {
          throw new Error(`Default benchmark config ${benchmarkConfig.id} is missing family ${agent.family_id}`);
        }

        if (
          agent.release_id !== target.release_id ||
          agent.benchmark_config_model_id !== target.id
        ) {
          updateAgent.run(target.release_id, target.id, agent.id);
          agentsUpdated += 1;
          changed = true;
        }
      }

      if (changed) {
        cohortsUpdated += 1;
      }
    }

    if (cohortsUpdated > 0 || agentsUpdated > 0) {
      logSystemEvent('active_cohort_lineup_refreshed', {
        default_config_id: benchmarkConfig.id,
        cohorts_updated: cohortsUpdated,
        agents_updated: agentsUpdated
      });
    }

    return {
      default_config_id: benchmarkConfig.id,
      cohorts_updated: cohortsUpdated,
      agents_updated: agentsUpdated
    };
  });
}

export async function runDecisions(): Promise<CronAppResult<RunDecisionsSuccess>> {
  try {
    console.log('Starting weekly decision run...');

    const startTime = Date.now();
    const cohortBootstrap = maybeStartNewCohort(false);
    const lineupRefresh = refreshActiveCohortsToDefaultBenchmarkConfig();
    const results = await runAllDecisions();
    const duration = Date.now() - startTime;
    const totalAgents = results.reduce((sum, result) => sum + result.agents_processed, 0);
    const totalErrors = results.reduce((sum, result) => sum + result.errors.length, 0);
    const successfulAgents = results.reduce(
      (sum, result) => sum + result.decisions.filter((decision) => decision.success).length,
      0
    );
    const summary = {
      cohorts_processed: results.length,
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
      lineup_refresh: lineupRefresh,
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
