export interface Cohort {
  id: string;
  cohort_number: number;
  started_at: string;
  status: 'active' | 'completed';
  completed_at: string | null;
  methodology_version: string;
  benchmark_config_id: string | null;
  initial_balance: number;
  created_at: string;
}

export interface Model {
  id: string;
  openrouter_id: string;
  display_name: string;
  provider: string;
  color: string | null;
  is_active: number;
  added_at: string;
}

export interface Agent {
  id: string;
  cohort_id: string;
  model_id: string;
  family_id: string | null;
  release_id: string | null;
  benchmark_config_model_id: string | null;
  cash_balance: number;
  total_invested: number;
  status: 'active' | 'bankrupt';
  created_at: string;
}

export interface ModelFamily {
  id: string;
  slug: string;
  legacy_model_id: string | null;
  provider: string;
  family_name: string;
  public_display_name: string;
  short_display_name: string;
  color: string | null;
  status: 'active' | 'paused' | 'retired';
  sort_order: number;
  created_at: string;
  retired_at: string | null;
}

export interface ModelRelease {
  id: string;
  family_id: string;
  release_name: string;
  release_slug: string;
  openrouter_id: string;
  provider: string;
  metadata_json: string | null;
  release_status: 'active' | 'deprecated' | 'retired';
  created_at: string;
  retired_at: string | null;
  first_used_cohort_number: number | null;
  last_used_cohort_number: number | null;
}

export interface BenchmarkConfig {
  id: string;
  version_name: string;
  methodology_version: string;
  notes: string | null;
  created_by: string | null;
  is_default_for_future_cohorts: number;
  created_at: string;
}

export interface BenchmarkConfigModel {
  id: string;
  benchmark_config_id: string;
  family_id: string;
  release_id: string;
  slot_order: number;
  family_display_name_snapshot: string;
  short_display_name_snapshot: string;
  release_display_name_snapshot: string;
  provider_snapshot: string;
  color_snapshot: string | null;
  openrouter_id_snapshot: string;
  input_price_per_million_snapshot: number;
  output_price_per_million_snapshot: number;
  created_at: string;
}

export interface MethodologyVersion {
  version: string;
  title: string;
  description: string;
  changes_summary: string | null;
  effective_from_cohort: number | null;
  document_hash: string | null;
  created_at: string;
}
