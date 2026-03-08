import type {
  BenchmarkConfig,
  ModelFamily,
  ModelRelease
} from '@/lib/types';
import type { BenchmarkConfigModelAssignment } from '@/lib/db/queries/benchmark-configs';

export interface AdminReleaseMetadata {
  notes?: string;
  default_input_price_per_million?: number;
  default_output_price_per_million?: number;
  [key: string]: unknown;
}

export interface AdminBenchmarkReleaseSummary extends ModelRelease {
  default_input_price_per_million: number | null;
  default_output_price_per_million: number | null;
  metadata: AdminReleaseMetadata | null;
}

export interface AdminBenchmarkFamilySummary extends ModelFamily {
  current_release_id: string | null;
  current_release_name: string | null;
  current_openrouter_id: string | null;
  current_input_price_per_million: number | null;
  current_output_price_per_million: number | null;
  releases: AdminBenchmarkReleaseSummary[];
}

export interface AdminBenchmarkConfigSummary extends BenchmarkConfig {
  models: BenchmarkConfigModelAssignment[];
}

export interface AdminBenchmarkOverview {
  default_config_id: string | null;
  active_cohort_count: number;
  active_agent_count: number;
  families: AdminBenchmarkFamilySummary[];
  configs: AdminBenchmarkConfigSummary[];
  updated_at: string;
}

export interface AdminBenchmarkRolloverFamilyChange {
  family_id: string;
  family_name: string;
  from_release_name: string | null;
  to_release_name: string;
  affected_agents: number;
}

export interface AdminBenchmarkRolloverPreview {
  config_id: string;
  version_name: string;
  active_cohorts: number;
  active_agents: number;
  impacted_cohorts: number;
  impacted_agents: number;
  family_changes: AdminBenchmarkRolloverFamilyChange[];
}

export interface CreateAdminModelReleaseInput {
  family_id: string;
  release_name: string;
  release_slug?: string;
  openrouter_id: string;
  default_input_price_per_million: number;
  default_output_price_per_million: number;
  notes?: string;
}

export interface CreateAdminBenchmarkConfigAssignmentInput {
  family_id: string;
  release_id: string;
  input_price_per_million: number;
  output_price_per_million: number;
}

export interface CreateAdminBenchmarkConfigInput {
  version_name: string;
  methodology_version: string;
  notes?: string;
  assignments: CreateAdminBenchmarkConfigAssignmentInput[];
}
