import { SEEDED_BENCHMARK_CONFIG_ID, SEEDED_MODELS } from '../models.mjs';

export function seedScenarioMetadata(db, description) {
  db.prepare(`
    INSERT INTO methodology_versions (version, title, description, effective_from_cohort)
    VALUES ('v1', 'Forecaster Arena Methodology v1', ?, 1)
  `).run(description);

  const insertModel = db.prepare(`
    INSERT INTO models (id, openrouter_id, display_name, provider, color)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertFamily = db.prepare(`
    INSERT INTO model_families (
      id, slug, legacy_model_id, provider, family_name, public_display_name,
      short_display_name, color, status, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `);
  const insertRelease = db.prepare(`
    INSERT INTO model_releases (
      id, family_id, release_name, release_slug, openrouter_id, provider,
      release_status, first_used_cohort_number
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', 1)
  `);
  const insertConfig = db.prepare(`
    INSERT INTO benchmark_configs (
      id, version_name, methodology_version, notes, created_by, is_default_for_future_cohorts
    ) VALUES (?, 'e2e-default', 'v1', ?, 'prepare-e2e-db', 1)
  `);
  const insertConfigModel = db.prepare(`
    INSERT INTO benchmark_config_models (
      id, benchmark_config_id, family_id, release_id, slot_order,
      family_display_name_snapshot, short_display_name_snapshot, release_display_name_snapshot,
      provider_snapshot, color_snapshot, openrouter_id_snapshot,
      input_price_per_million_snapshot, output_price_per_million_snapshot
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertConfig.run(SEEDED_BENCHMARK_CONFIG_ID, `${description} benchmark config`);

  for (const [index, model] of SEEDED_MODELS.entries()) {
    insertModel.run(model.id, model.openrouterId, model.displayName, model.provider, model.color);
    insertFamily.run(
      model.familyId,
      model.familySlug,
      model.id,
      model.provider,
      model.displayName,
      model.displayName,
      model.shortDisplayName,
      model.color,
      index
    );
    insertRelease.run(
      model.releaseId,
      model.familyId,
      model.displayName,
      model.releaseSlug,
      model.openrouterId,
      model.provider
    );
    insertConfigModel.run(
      `${SEEDED_BENCHMARK_CONFIG_ID}--${model.familyId}`,
      SEEDED_BENCHMARK_CONFIG_ID,
      model.familyId,
      model.releaseId,
      index,
      model.displayName,
      model.shortDisplayName,
      model.displayName,
      model.provider,
      model.color,
      model.openrouterId,
      model.inputPrice,
      model.outputPrice
    );
  }
}
