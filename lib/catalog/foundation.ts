import type Database from 'better-sqlite3';

import { METHODOLOGY_VERSION } from '@/lib/constants';
import {
  type CohortBackfillAgentRow,
  ensureBootstrapFamilies,
  ensureModelFamilyForLegacyModel,
  ensureReleaseForLegacyModel,
  getAllLegacyModels,
  getModelById,
  getModelFamilyById,
  getOrCreateDefaultBenchmarkConfig,
  insertConfigModelSnapshot
} from '@/lib/catalog/foundation/helpers';

function ensureDefaultBenchmarkConfigModels(
  db: Database.Database,
  configId: string
): void {
  const activeModels = getAllLegacyModels(db).filter((model) => model.is_active === 1);

  for (const model of activeModels) {
    const family = ensureModelFamilyForLegacyModel(db, model);
    const releaseId = ensureReleaseForLegacyModel(db, family.id, model);

    insertConfigModelSnapshot(db, {
      configId,
      configModelId: `${configId}--${family.id}`,
      family,
      releaseId,
      model
    });
  }
}

function createOrUpdateBackfillConfigForCohort(
  db: Database.Database,
  cohort: { id: string; cohort_number: number }
): string {
  const configId = `benchmark-config-backfill-${cohort.id}`;

  db.prepare(`
    INSERT INTO benchmark_configs (
      id,
      version_name,
      methodology_version,
      notes,
      created_by,
      is_default_for_future_cohorts
    ) VALUES (?, ?, ?, ?, ?, 0)
    ON CONFLICT(id) DO UPDATE SET
      version_name = excluded.version_name,
      methodology_version = excluded.methodology_version,
      notes = excluded.notes,
      created_by = excluded.created_by
  `).run(
    configId,
    `legacy-backfill-cohort-${cohort.cohort_number}`,
    METHODOLOGY_VERSION,
    'Backfilled from legacy agent/model rows. Release lineage is inferred from the legacy catalog state at migration time.',
    'system:legacy-backfill'
  );

  const agentRows = db.prepare(`
    SELECT model_id, family_id, release_id, benchmark_config_model_id
    FROM agents
    WHERE cohort_id = ?
    ORDER BY model_id ASC
  `).all(cohort.id) as CohortBackfillAgentRow[];

  for (const row of agentRows) {
    if (row.benchmark_config_model_id) {
      continue;
    }

    const model = getModelById(db, row.model_id);
    if (!model) {
      continue;
    }

    const family = row.family_id
      ? getModelFamilyById(db, row.family_id) ?? ensureModelFamilyForLegacyModel(db, model)
      : ensureModelFamilyForLegacyModel(db, model);
    const releaseId = row.release_id ?? ensureReleaseForLegacyModel(db, family.id, model);

    insertConfigModelSnapshot(db, {
      configId,
      configModelId: `${configId}--${family.id}`,
      family,
      releaseId,
      model
    });
  }

  return configId;
}

function backfillCohortConfigs(db: Database.Database): void {
  const cohorts = db.prepare(`
    SELECT id, cohort_number
    FROM cohorts
    WHERE benchmark_config_id IS NULL
    ORDER BY cohort_number ASC
  `).all() as Array<{ id: string; cohort_number: number }>;

  const updateCohort = db.prepare(`
    UPDATE cohorts
    SET benchmark_config_id = ?
    WHERE id = ?
  `);

  for (const cohort of cohorts) {
    const configId = createOrUpdateBackfillConfigForCohort(db, cohort);
    updateCohort.run(configId, cohort.id);
  }
}

function backfillAgents(db: Database.Database): void {
  const rows = db.prepare(`
    SELECT
      a.id,
      a.model_id,
      COALESCE(a.family_id, mf.id) as resolved_family_id,
      COALESCE(a.release_id, r.id) as resolved_release_id,
      bcm.id as resolved_config_model_id
    FROM agents a
    JOIN cohorts c ON c.id = a.cohort_id
    LEFT JOIN model_families mf ON mf.legacy_model_id = a.model_id
    LEFT JOIN model_releases r
      ON r.family_id = COALESCE(a.family_id, mf.id)
     AND r.openrouter_id = (SELECT openrouter_id FROM models WHERE id = a.model_id)
    LEFT JOIN benchmark_config_models bcm
      ON bcm.benchmark_config_id = c.benchmark_config_id
     AND bcm.family_id = COALESCE(a.family_id, mf.id)
    WHERE a.family_id IS NULL
       OR a.release_id IS NULL
       OR a.benchmark_config_model_id IS NULL
  `).all() as Array<{
    id: string;
    resolved_family_id: string | null;
    resolved_release_id: string | null;
    resolved_config_model_id: string | null;
  }>;

  const updateAgent = db.prepare(`
    UPDATE agents
    SET family_id = ?,
        release_id = ?,
        benchmark_config_model_id = ?
    WHERE id = ?
  `);

  for (const row of rows) {
    if (!row.resolved_family_id || !row.resolved_release_id || !row.resolved_config_model_id) {
      continue;
    }

    updateAgent.run(
      row.resolved_family_id,
      row.resolved_release_id,
      row.resolved_config_model_id,
      row.id
    );
  }
}

function refreshReleaseUsage(db: Database.Database): void {
  db.prepare(`
    UPDATE model_releases
    SET first_used_cohort_number = NULL,
        last_used_cohort_number = NULL
  `).run();

  const usage = db.prepare(`
    SELECT
      a.release_id,
      MIN(c.cohort_number) as first_used_cohort_number,
      MAX(c.cohort_number) as last_used_cohort_number
    FROM agents a
    JOIN cohorts c ON c.id = a.cohort_id
    WHERE a.release_id IS NOT NULL
    GROUP BY a.release_id
  `).all() as Array<{
    release_id: string;
    first_used_cohort_number: number;
    last_used_cohort_number: number;
  }>;

  const updateRelease = db.prepare(`
    UPDATE model_releases
    SET first_used_cohort_number = ?,
        last_used_cohort_number = ?
    WHERE id = ?
  `);

  for (const row of usage) {
    updateRelease.run(
      row.first_used_cohort_number,
      row.last_used_cohort_number,
      row.release_id
    );
  }
}

function assertModelIdentityFoundationComplete(db: Database.Database): void {
  const missingCohortConfig = db.prepare(`
    SELECT COUNT(*) as count
    FROM cohorts
    WHERE benchmark_config_id IS NULL
  `).get() as { count: number };

  if (missingCohortConfig.count > 0) {
    throw new Error('Model identity foundation is incomplete: cohorts are missing benchmark_config_id values');
  }

  const missingAgentLineage = db.prepare(`
    SELECT COUNT(*) as count
    FROM agents
    WHERE family_id IS NULL
       OR release_id IS NULL
       OR benchmark_config_model_id IS NULL
  `).get() as { count: number };

  if (missingAgentLineage.count > 0) {
    throw new Error('Model identity foundation is incomplete: agents are missing frozen family/release/config lineage');
  }
}

export function ensureModelIdentityFoundation(db: Database.Database): void {
  ensureBootstrapFamilies(db);

  for (const model of getAllLegacyModels(db)) {
    const family = ensureModelFamilyForLegacyModel(db, model);
    ensureReleaseForLegacyModel(db, family.id, model);
  }

  const defaultConfigId = getOrCreateDefaultBenchmarkConfig(db);
  ensureDefaultBenchmarkConfigModels(db, defaultConfigId);
  backfillCohortConfigs(db);
  backfillAgents(db);
  assertModelIdentityFoundationComplete(db);
  refreshReleaseUsage(db);
}
