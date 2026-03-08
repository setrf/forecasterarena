export const CATALOG_TABLES_SQL = `
-- ============================================================================
-- MODEL FAMILIES
-- ============================================================================
-- Stable benchmark competitor slots such as "OpenAI GPT" or "Google Gemini".

CREATE TABLE IF NOT EXISTS model_families (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  legacy_model_id TEXT UNIQUE,
  provider TEXT NOT NULL,
  family_name TEXT NOT NULL,
  public_display_name TEXT NOT NULL,
  short_display_name TEXT NOT NULL,
  color TEXT,
  status TEXT NOT NULL DEFAULT 'active',        -- active | paused | retired
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  retired_at TEXT
);

-- ============================================================================
-- MODEL RELEASES
-- ============================================================================
-- Immutable deployable releases within a family.

CREATE TABLE IF NOT EXISTS model_releases (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  release_name TEXT NOT NULL,
  release_slug TEXT NOT NULL,
  openrouter_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  metadata_json TEXT,
  release_status TEXT NOT NULL DEFAULT 'active', -- active | deprecated | retired
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  retired_at TEXT,
  first_used_cohort_number INTEGER,
  last_used_cohort_number INTEGER,
  FOREIGN KEY (family_id) REFERENCES model_families(id),
  UNIQUE(family_id, release_slug)
);

-- ============================================================================
-- BENCHMARK CONFIGS
-- ============================================================================
-- Immutable lineups for future cohort creation.

CREATE TABLE IF NOT EXISTS benchmark_configs (
  id TEXT PRIMARY KEY,
  version_name TEXT NOT NULL UNIQUE,
  methodology_version TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  is_default_for_future_cohorts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (methodology_version) REFERENCES methodology_versions(version)
);

-- ============================================================================
-- BENCHMARK CONFIG MODELS
-- ============================================================================
-- Frozen family + release assignments for a benchmark config.

CREATE TABLE IF NOT EXISTS benchmark_config_models (
  id TEXT PRIMARY KEY,
  benchmark_config_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  release_id TEXT NOT NULL,
  slot_order INTEGER NOT NULL,
  family_display_name_snapshot TEXT NOT NULL,
  short_display_name_snapshot TEXT NOT NULL,
  release_display_name_snapshot TEXT NOT NULL,
  provider_snapshot TEXT NOT NULL,
  color_snapshot TEXT,
  openrouter_id_snapshot TEXT NOT NULL,
  input_price_per_million_snapshot REAL NOT NULL,
  output_price_per_million_snapshot REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (benchmark_config_id) REFERENCES benchmark_configs(id),
  FOREIGN KEY (family_id) REFERENCES model_families(id),
  FOREIGN KEY (release_id) REFERENCES model_releases(id),
  UNIQUE(benchmark_config_id, family_id)
);
`;
