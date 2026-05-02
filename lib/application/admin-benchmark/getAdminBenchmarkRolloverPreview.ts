import { getDb } from '@/lib/db';
import {
  getActiveCohorts,
  getAgentsByCohort,
  getBenchmarkConfigById,
  getBenchmarkConfigModels
} from '@/lib/db/queries';
import type { AdminOperationResult } from '@/lib/application/admin/types';
import type { AdminBenchmarkRolloverPreview } from '@/lib/application/admin-benchmark/types';

export function getAdminBenchmarkRolloverPreview(
  configId: string
): AdminOperationResult<AdminBenchmarkRolloverPreview> {
  const config = getBenchmarkConfigById(configId);
  if (!config) {
    return { ok: false, status: 404, error: 'Unknown benchmark config' };
  }

  const configModels = getBenchmarkConfigModels(configId);
  const configByFamily = new Map(configModels.map((model) => [model.family_id, model] as const));
  const activeCohorts = getActiveCohorts();
  const db = getDb();

  let activeAgents = 0;
  let impactedAgents = 0;
  let impactedCohorts = 0;
  const familyChanges = new Map<string, {
    family_id: string;
    family_name: string;
    from_release_name: string | null;
    to_release_name: string;
    affected_agents: number;
  }>();

  for (const cohort of activeCohorts) {
    let cohortChanged = cohort.benchmark_config_id !== configId;
    const agents = getAgentsByCohort(cohort.id);
    activeAgents += agents.length;

    for (const agent of agents) {
      const target = configByFamily.get(agent.family_id);
      if (!target) {
        continue;
      }

      if (
        agent.release_id !== target.release_id ||
        agent.benchmark_config_model_id !== target.id
      ) {
        impactedAgents += 1;
        cohortChanged = true;

        const current = familyChanges.get(agent.family_id);
        if (current) {
          current.affected_agents += 1;
          continue;
        }

        const currentReleaseRow = db.prepare(`
          SELECT DISTINCT COALESCE(mr.release_name, bcm.release_display_name_snapshot) as release_name
          FROM agents a
          LEFT JOIN model_releases mr ON mr.id = a.release_id
          LEFT JOIN benchmark_config_models bcm ON bcm.id = a.benchmark_config_model_id
          JOIN cohorts c ON c.id = a.cohort_id
          WHERE c.status = 'active' AND a.family_id = ?
          LIMIT 1
        `).get(agent.family_id) as { release_name: string | null } | undefined;

        familyChanges.set(agent.family_id, {
          family_id: agent.family_id,
          family_name: target.family_display_name_snapshot,
          from_release_name: currentReleaseRow?.release_name ?? null,
          to_release_name: target.release_display_name_snapshot,
          affected_agents: 1
        });
      }
    }

    if (cohortChanged) {
      impactedCohorts += 1;
    }
  }

  return {
    ok: true,
    data: {
      config_id: config.id,
      version_name: config.version_name,
      active_cohorts: activeCohorts.length,
      active_agents: activeAgents,
      impacted_cohorts: impactedCohorts,
      impacted_agents: impactedAgents,
      family_changes: Array.from(familyChanges.values()).sort((a, b) => a.family_name.localeCompare(b.family_name))
    }
  };
}

export function applyAdminBenchmarkRollover(
  configId: string
): AdminOperationResult<AdminBenchmarkRolloverPreview> {
  return {
    ok: false,
    status: 400,
    error: 'Active cohort rollover is disabled; promote defaults for future cohorts only.'
  };
}
