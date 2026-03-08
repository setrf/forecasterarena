import type Database from 'better-sqlite3';

import { METHODOLOGY_VERSION } from '@/lib/constants';
import {
  MODEL_FAMILY_BOOTSTRAP,
  findBootstrapFamilyByFamilyId,
  findBootstrapFamilyByLegacyModelId
} from '@/lib/catalog/bootstrap';

interface LegacyModelRow {
  id: string;
  openrouter_id: string;
  display_name: string;
  provider: string;
  color: string | null;
  is_active: number;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'release';
}

function buildReleaseId(familyId: string, releaseSlug: string): string {
  return `${familyId}--${releaseSlug}`;
}

function getPricingSnapshot(familyId: string): {
  input: number;
  output: number;
} {
  const bootstrap = findBootstrapFamilyByFamilyId(familyId);
  if (!bootstrap) {
    return { input: 2, output: 8 };
  }

  return {
    input: bootstrap.inputPricePerMillion,
    output: bootstrap.outputPricePerMillion
  };
}

function ensureModelFamilies(db: Database.Database): void {
  const statement = db.prepare(`
    INSERT INTO model_families (
      id,
      slug,
      legacy_model_id,
      provider,
      family_name,
      public_display_name,
      short_display_name,
      color,
      status,
      sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      legacy_model_id = excluded.legacy_model_id,
      provider = excluded.provider,
      family_name = excluded.family_name,
      public_display_name = excluded.public_display_name,
      short_display_name = excluded.short_display_name,
      color = excluded.color,
      sort_order = excluded.sort_order,
      status = 'active',
      retired_at = NULL
  `);

  for (const family of MODEL_FAMILY_BOOTSTRAP) {
    statement.run(
      family.familyId,
      family.slug,
      family.legacyModelId,
      family.provider,
      family.familyName,
      family.publicDisplayName,
      family.shortDisplayName,
      family.color,
      family.sortOrder
    );
  }
}

function ensureReleaseForLegacyModel(
  db: Database.Database,
  familyId: string,
  model: LegacyModelRow
): string {
  const bootstrap = findBootstrapFamilyByLegacyModelId(model.id);
  const releaseSlug = bootstrap && bootstrap.initialOpenrouterId === model.openrouter_id
    ? bootstrap.initialReleaseSlug
    : slugify(model.display_name);
  const releaseId = buildReleaseId(familyId, releaseSlug);

  db.prepare(`
    INSERT INTO model_releases (
      id,
      family_id,
      release_name,
      release_slug,
      openrouter_id,
      provider,
      metadata_json,
      release_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    ON CONFLICT(id) DO NOTHING
  `).run(
    releaseId,
    familyId,
    model.display_name,
    releaseSlug,
    model.openrouter_id,
    model.provider,
    JSON.stringify({
      seeded_from_legacy_model_id: model.id,
      seeded_at: new Date().toISOString()
    })
  );

  return releaseId;
}

function getOrCreateDefaultBenchmarkConfig(db: Database.Database): string {
  const existingDefault = db.prepare(`
    SELECT id
    FROM benchmark_configs
    WHERE is_default_for_future_cohorts = 1
    ORDER BY created_at DESC
    LIMIT 1
  `).get() as { id: string } | undefined;

  if (existingDefault) {
    return existingDefault.id;
  }

  const configId = 'benchmark-config-bootstrap-default';
  db.prepare(`
    INSERT INTO benchmark_configs (
      id,
      version_name,
      methodology_version,
      notes,
      created_by,
      is_default_for_future_cohorts
    ) VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(id) DO NOTHING
  `).run(
    configId,
    'bootstrap-default-lineup',
    METHODOLOGY_VERSION,
    'Bootstrapped default lineup created during model identity migration.',
    'system:migration'
  );

  db.prepare(`
    UPDATE benchmark_configs
    SET is_default_for_future_cohorts = CASE WHEN id = ? THEN 1 ELSE 0 END
  `).run(configId);

  return configId;
}

function ensureDefaultBenchmarkConfigModels(
  db: Database.Database,
  configId: string
): void {
  const activeModels = db.prepare(`
    SELECT *
    FROM models
    WHERE is_active = 1
    ORDER BY display_name ASC
  `).all() as LegacyModelRow[];

  const insertConfigModel = db.prepare(`
    INSERT INTO benchmark_config_models (
      id,
      benchmark_config_id,
      family_id,
      release_id,
      slot_order,
      family_display_name_snapshot,
      short_display_name_snapshot,
      release_display_name_snapshot,
      provider_snapshot,
      color_snapshot,
      openrouter_id_snapshot,
      input_price_per_million_snapshot,
      output_price_per_million_snapshot
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(benchmark_config_id, family_id) DO NOTHING
  `);

  for (const family of MODEL_FAMILY_BOOTSTRAP) {
    const matchingModel = activeModels.find((model) => model.id === family.legacyModelId);
    if (!matchingModel) {
      continue;
    }

    const releaseId = ensureReleaseForLegacyModel(db, family.familyId, matchingModel);
    const pricing = getPricingSnapshot(family.familyId);

    insertConfigModel.run(
      `${configId}--${family.familyId}`,
      configId,
      family.familyId,
      releaseId,
      family.sortOrder,
      family.publicDisplayName,
      family.shortDisplayName,
      matchingModel.display_name,
      matchingModel.provider,
      matchingModel.color,
      matchingModel.openrouter_id,
      pricing.input,
      pricing.output
    );
  }
}

function backfillCohortConfigs(
  db: Database.Database,
  configId: string
): void {
  db.prepare(`
    UPDATE cohorts
    SET benchmark_config_id = COALESCE(benchmark_config_id, ?)
    WHERE benchmark_config_id IS NULL
  `).run(configId);
}

function backfillAgents(
  db: Database.Database
): void {
  const rows = db.prepare(`
    SELECT
      a.id,
      a.model_id,
      a.family_id,
      a.release_id,
      a.benchmark_config_model_id,
      c.benchmark_config_id,
      bcm.id as resolved_config_model_id,
      bcm.release_id as resolved_release_id,
      bcm.family_id as resolved_family_id
    FROM agents a
    JOIN cohorts c ON c.id = a.cohort_id
    LEFT JOIN model_families mf ON mf.legacy_model_id = a.model_id
    LEFT JOIN benchmark_config_models bcm
      ON bcm.benchmark_config_id = c.benchmark_config_id
      AND bcm.family_id = COALESCE(a.family_id, mf.id)
    WHERE a.family_id IS NULL
       OR a.release_id IS NULL
       OR a.benchmark_config_model_id IS NULL
  `).all() as Array<{
    id: string;
    model_id: string;
    family_id: string | null;
    release_id: string | null;
    benchmark_config_model_id: string | null;
    benchmark_config_id: string | null;
    resolved_config_model_id: string | null;
    resolved_release_id: string | null;
    resolved_family_id: string | null;
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

export function ensureModelIdentityFoundation(db: Database.Database): void {
  ensureModelFamilies(db);

  for (const model of db.prepare('SELECT * FROM models').all() as LegacyModelRow[]) {
    const family = findBootstrapFamilyByLegacyModelId(model.id);
    if (!family) {
      continue;
    }

    ensureReleaseForLegacyModel(db, family.familyId, model);
  }

  const defaultConfigId = getOrCreateDefaultBenchmarkConfig(db);
  ensureDefaultBenchmarkConfigModels(db, defaultConfigId);
  backfillCohortConfigs(db, defaultConfigId);
  backfillAgents(db);
  refreshReleaseUsage(db);
}
