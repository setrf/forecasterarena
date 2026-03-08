import type Database from 'better-sqlite3';

export function initializeViews(db: Database.Database): void {
  db.exec('DROP VIEW IF EXISTS agent_benchmark_identity_v');

  db.exec(`
    CREATE VIEW agent_benchmark_identity_v AS
    SELECT
      a.id as agent_id,
      a.cohort_id,
      a.model_id as legacy_model_id,
      a.family_id as family_id,
      f.slug as family_slug,
      bcm.family_display_name_snapshot as family_display_name,
      bcm.short_display_name_snapshot as short_display_name,
      a.release_id as release_id,
      r.release_slug as release_slug,
      bcm.release_display_name_snapshot as release_display_name,
      bcm.provider_snapshot as provider,
      bcm.color_snapshot as color,
      bcm.openrouter_id_snapshot as openrouter_id,
      bcm.input_price_per_million_snapshot as input_price_per_million,
      bcm.output_price_per_million_snapshot as output_price_per_million,
      bcm.id as benchmark_config_model_id
    FROM agents a
    LEFT JOIN benchmark_config_models bcm ON bcm.id = a.benchmark_config_model_id
    LEFT JOIN model_families f ON f.id = a.family_id
    LEFT JOIN model_releases r ON r.id = a.release_id
  `);
}
