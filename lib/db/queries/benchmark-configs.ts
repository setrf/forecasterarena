import { generateId, getDb } from '../index';
import type { BenchmarkConfig } from '../../types';

export interface BenchmarkConfigModelAssignment {
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
  family_slug: string;
  legacy_model_id: string | null;
  created_at: string;
}

export function getDefaultBenchmarkConfig(): BenchmarkConfig | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT *
    FROM benchmark_configs
    WHERE is_default_for_future_cohorts = 1
    ORDER BY created_at DESC
    LIMIT 1
  `).get() as BenchmarkConfig | undefined;
}

export function getAllBenchmarkConfigs(limit?: number): BenchmarkConfig[] {
  const db = getDb();

  if (typeof limit === 'number') {
    return db.prepare(`
      SELECT *
      FROM benchmark_configs
      ORDER BY is_default_for_future_cohorts DESC, created_at DESC
      LIMIT ?
    `).all(limit) as BenchmarkConfig[];
  }

  return db.prepare(`
    SELECT *
    FROM benchmark_configs
    ORDER BY is_default_for_future_cohorts DESC, created_at DESC
  `).all() as BenchmarkConfig[];
}

export function getBenchmarkConfigById(id: string): BenchmarkConfig | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT *
    FROM benchmark_configs
    WHERE id = ?
  `).get(id) as BenchmarkConfig | undefined;
}

export function getBenchmarkConfigModels(configId: string): BenchmarkConfigModelAssignment[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      bcm.*,
      mf.slug as family_slug,
      mf.legacy_model_id
    FROM benchmark_config_models bcm
    JOIN model_families mf ON mf.id = bcm.family_id
    WHERE bcm.benchmark_config_id = ?
    ORDER BY bcm.slot_order ASC, bcm.family_display_name_snapshot ASC
  `).all(configId) as BenchmarkConfigModelAssignment[];
}

export function getBenchmarkConfigModelByFamily(
  configId: string,
  familyId: string
): BenchmarkConfigModelAssignment | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT
      bcm.*,
      mf.slug as family_slug,
      mf.legacy_model_id
    FROM benchmark_config_models bcm
    JOIN model_families mf ON mf.id = bcm.family_id
    WHERE bcm.benchmark_config_id = ?
      AND bcm.family_id = ?
    LIMIT 1
  `).get(configId, familyId) as BenchmarkConfigModelAssignment | undefined;
}

export function createBenchmarkConfig(args: {
  version_name: string;
  methodology_version: string;
  notes?: string | null;
  created_by?: string | null;
  is_default_for_future_cohorts?: boolean;
}): BenchmarkConfig {
  const db = getDb();
  const id = generateId();

  db.prepare(`
    INSERT INTO benchmark_configs (
      id,
      version_name,
      methodology_version,
      notes,
      created_by,
      is_default_for_future_cohorts
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    args.version_name,
    args.methodology_version,
    args.notes ?? null,
    args.created_by ?? null,
    args.is_default_for_future_cohorts ? 1 : 0
  );

  if (args.is_default_for_future_cohorts) {
    setDefaultBenchmarkConfig(id);
  }

  return getBenchmarkConfigById(id)!;
}

export function createBenchmarkConfigModel(args: {
  benchmark_config_id: string;
  family_id: string;
  release_id: string;
  slot_order: number;
  family_display_name_snapshot: string;
  short_display_name_snapshot: string;
  release_display_name_snapshot: string;
  provider_snapshot: string;
  color_snapshot?: string | null;
  openrouter_id_snapshot: string;
  input_price_per_million_snapshot: number;
  output_price_per_million_snapshot: number;
}): BenchmarkConfigModelAssignment {
  const db = getDb();
  const id = generateId();
  const release = db.prepare('SELECT family_id FROM model_releases WHERE id = ?')
    .get(args.release_id) as { family_id: string } | undefined;

  if (!release) {
    throw new Error(`Unknown model release: ${args.release_id}`);
  }

  if (release.family_id !== args.family_id) {
    throw new Error(`Release ${args.release_id} does not belong to family ${args.family_id}`);
  }

  db.prepare(`
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
  `).run(
    id,
    args.benchmark_config_id,
    args.family_id,
    args.release_id,
    args.slot_order,
    args.family_display_name_snapshot,
    args.short_display_name_snapshot,
    args.release_display_name_snapshot,
    args.provider_snapshot,
    args.color_snapshot ?? null,
    args.openrouter_id_snapshot,
    args.input_price_per_million_snapshot,
    args.output_price_per_million_snapshot
  );

  return getBenchmarkConfigModels(args.benchmark_config_id).find((row) => row.id === id)!;
}

export function setDefaultBenchmarkConfig(configId: string): void {
  const db = getDb();
  const exists = getBenchmarkConfigById(configId);
  if (!exists) {
    throw new Error(`Unknown benchmark config: ${configId}`);
  }

  db.prepare(`
    UPDATE benchmark_configs
    SET is_default_for_future_cohorts = CASE WHEN id = ? THEN 1 ELSE 0 END
  `).run(configId);
}
