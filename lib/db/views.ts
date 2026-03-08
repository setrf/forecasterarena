import type Database from 'better-sqlite3';

export function initializeViews(db: Database.Database): void {
  db.exec('DROP VIEW IF EXISTS agent_benchmark_identity_v');

  db.exec(`
    CREATE VIEW agent_benchmark_identity_v AS
    SELECT
      a.id as agent_id,
      a.cohort_id,
      a.model_id as legacy_model_id,
      COALESCE(a.family_id, bcm.family_id, f_legacy.id) as family_id,
      COALESCE(f_current.slug, f_legacy.slug) as family_slug,
      COALESCE(
        bcm.family_display_name_snapshot,
        f_current.public_display_name,
        f_legacy.public_display_name,
        legacy.display_name
      ) as family_display_name,
      COALESCE(
        bcm.short_display_name_snapshot,
        f_current.short_display_name,
        f_legacy.short_display_name,
        legacy.display_name
      ) as short_display_name,
      COALESCE(a.release_id, bcm.release_id, r_legacy.id) as release_id,
      COALESCE(r_current.release_slug, r_legacy.release_slug) as release_slug,
      COALESCE(
        bcm.release_display_name_snapshot,
        r_current.release_name,
        r_legacy.release_name,
        legacy.display_name
      ) as release_display_name,
      COALESCE(
        bcm.provider_snapshot,
        f_current.provider,
        f_legacy.provider,
        legacy.provider
      ) as provider,
      COALESCE(
        bcm.color_snapshot,
        f_current.color,
        f_legacy.color,
        legacy.color
      ) as color,
      COALESCE(
        bcm.openrouter_id_snapshot,
        r_current.openrouter_id,
        r_legacy.openrouter_id,
        legacy.openrouter_id
      ) as openrouter_id,
      bcm.input_price_per_million_snapshot as input_price_per_million,
      bcm.output_price_per_million_snapshot as output_price_per_million,
      bcm.id as benchmark_config_model_id
    FROM agents a
    LEFT JOIN benchmark_config_models bcm ON a.benchmark_config_model_id = bcm.id
    LEFT JOIN model_families f_current ON COALESCE(a.family_id, bcm.family_id) = f_current.id
    LEFT JOIN model_families f_legacy ON a.model_id = f_legacy.legacy_model_id
    LEFT JOIN model_releases r_current ON COALESCE(a.release_id, bcm.release_id) = r_current.id
    LEFT JOIN models legacy ON a.model_id = legacy.id
    LEFT JOIN model_releases r_legacy
      ON r_current.id IS NULL
     AND r_legacy.family_id = COALESCE(f_current.id, f_legacy.id)
     AND r_legacy.openrouter_id = legacy.openrouter_id
  `);
}
