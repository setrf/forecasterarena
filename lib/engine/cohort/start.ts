import { logSystemEvent } from '@/lib/db';
import { withTransaction } from '@/lib/db/transactions';
import {
  getDefaultBenchmarkConfig,
  createAgentsForCohort,
  createCohort as dbCreateCohort,
  getAgentsByCohort
} from '@/lib/db/queries';
import type { StartCohortResult } from '@/lib/engine/cohort/types';

export function startNewCohort(): StartCohortResult {
  try {
    console.log('Starting new cohort...');

    const result = withTransaction(() => {
      const benchmarkConfig = getDefaultBenchmarkConfig();
      if (!benchmarkConfig) {
        throw new Error('No default benchmark config is configured for future cohorts');
      }

      const cohort = dbCreateCohort(benchmarkConfig.id);
      const existingAgents = getAgentsByCohort(cohort.id);

      const agents = existingAgents.length > 0
        ? existingAgents
        : createAgentsForCohort(cohort.id, benchmarkConfig.id);

      if (existingAgents.length === 0) {
        logSystemEvent('cohort_started', {
          cohort_id: cohort.id,
          cohort_number: cohort.cohort_number,
          num_agents: agents.length,
          benchmark_config_id: benchmarkConfig.id
        });
      }

      return { cohort, agents };
    });

    console.log(`Cohort #${result.cohort.cohort_number} started with ${result.agents.length} agents`);

    return {
      success: true,
      cohort: result.cohort,
      agents: result.agents
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logSystemEvent('cohort_start_error', { error: message }, 'error');

    return {
      success: false,
      error: message
    };
  }
}
