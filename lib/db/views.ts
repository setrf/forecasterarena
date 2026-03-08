import type Database from 'better-sqlite3';

export function initializeViews(db: Database.Database): void {
  db.exec('DROP VIEW IF EXISTS decision_benchmark_identity_v');
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

  db.exec(`
    CREATE VIEW decision_benchmark_identity_v AS
    SELECT
      d.id as decision_id,
      COALESCE(d.family_id, abi.family_id) as family_id,
      COALESCE(df.slug, abi.family_slug, abi.family_id) as family_slug,
      COALESCE(df.legacy_model_id, abi.legacy_model_id, a.model_id) as legacy_model_id,
      COALESCE(df.public_display_name, abi.family_display_name, dr.release_name, abi.release_display_name, a.model_id) as family_display_name,
      COALESCE(df.short_display_name, abi.short_display_name, dr.release_name, abi.release_display_name, a.model_id) as short_display_name,
      COALESCE(d.release_id, abi.release_id) as release_id,
      COALESCE(dr.release_slug, abi.release_slug, abi.release_id) as release_slug,
      COALESCE(dr.release_name, abi.release_display_name) as release_display_name,
      COALESCE(dr.provider, abi.provider, 'Unknown') as provider,
      COALESCE(df.color, abi.color, '#94A3B8') as color,
      COALESCE(dr.openrouter_id, abi.openrouter_id) as openrouter_id,
      COALESCE(bcm.input_price_per_million_snapshot, abi.input_price_per_million) as input_price_per_million,
      COALESCE(bcm.output_price_per_million_snapshot, abi.output_price_per_million) as output_price_per_million,
      COALESCE(d.benchmark_config_model_id, abi.benchmark_config_model_id) as benchmark_config_model_id
    FROM decisions d
    JOIN agents a ON a.id = d.agent_id
    LEFT JOIN agent_benchmark_identity_v abi ON abi.agent_id = a.id
    LEFT JOIN model_families df ON df.id = d.family_id
    LEFT JOIN model_releases dr ON dr.id = d.release_id
    LEFT JOIN benchmark_config_models bcm ON bcm.id = d.benchmark_config_model_id
  `);
}
