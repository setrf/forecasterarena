import type Database from 'better-sqlite3';

import {
  MODEL_FAMILY_BOOTSTRAP,
  findBootstrapFamilyByFamilyId,
  findBootstrapFamilyByLegacyModelId
} from '@/lib/catalog/bootstrap';
import { METHODOLOGY_VERSION } from '@/lib/constants';

export interface LegacyModelRow {
  id: string;
  openrouter_id: string;
  display_name: string;
  provider: string;
  color: string | null;
  is_active: number;
}

export interface ModelFamilyRow {
  id: string;
  slug: string;
  legacy_model_id: string | null;
  provider: string;
  family_name: string;
  public_display_name: string;
  short_display_name: string;
  color: string | null;
  sort_order: number;
}

export interface CohortBackfillAgentRow {
  model_id: string;
  family_id: string | null;
  release_id: string | null;
  benchmark_config_model_id: string | null;
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

export function getAllLegacyModels(db: Database.Database): LegacyModelRow[] {
  return db.prepare(`
    SELECT *
    FROM models
    ORDER BY display_name ASC, id ASC
  `).all() as LegacyModelRow[];
}

export function getModelById(
  db: Database.Database,
  modelId: string
): LegacyModelRow | undefined {
  return db.prepare(`
    SELECT *
    FROM models
    WHERE id = ?
  `).get(modelId) as LegacyModelRow | undefined;
}

function getNextFamilySortOrder(db: Database.Database): number {
  const row = db.prepare(`
    SELECT COALESCE(MAX(sort_order), 0) + 1 as next_sort_order
    FROM model_families
  `).get() as { next_sort_order: number };

  return row.next_sort_order;
}

export function getModelFamilyById(
  db: Database.Database,
  familyId: string
): ModelFamilyRow | undefined {
  return db.prepare(`
    SELECT *
    FROM model_families
    WHERE id = ?
  `).get(familyId) as ModelFamilyRow | undefined;
}

function getModelFamilyByLegacyModelId(
  db: Database.Database,
  legacyModelId: string
): ModelFamilyRow | undefined {
  return db.prepare(`
    SELECT *
    FROM model_families
    WHERE legacy_model_id = ?
  `).get(legacyModelId) as ModelFamilyRow | undefined;
}

function upsertModelFamily(
  db: Database.Database,
  family: ModelFamilyRow
): void {
  db.prepare(`
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
  `).run(
    family.id,
    family.slug,
    family.legacy_model_id,
    family.provider,
    family.family_name,
    family.public_display_name,
    family.short_display_name,
    family.color,
    family.sort_order
  );
}

export function ensureBootstrapFamilies(db: Database.Database): void {
  for (const family of MODEL_FAMILY_BOOTSTRAP) {
    upsertModelFamily(db, {
      id: family.familyId,
      slug: family.slug,
      legacy_model_id: family.legacyModelId,
      provider: family.provider,
      family_name: family.familyName,
      public_display_name: family.publicDisplayName,
      short_display_name: family.shortDisplayName,
      color: family.color,
      sort_order: family.sortOrder
    });
  }
}

export function ensureModelFamilyForLegacyModel(
  db: Database.Database,
  model: LegacyModelRow
): ModelFamilyRow {
  const bootstrap = findBootstrapFamilyByLegacyModelId(model.id);
  const fallbackId = slugify(model.id);
  const existing =
    (bootstrap ? getModelFamilyById(db, bootstrap.familyId) : undefined) ||
    getModelFamilyByLegacyModelId(db, model.id);

  const family: ModelFamilyRow = {
    id: bootstrap?.familyId ?? existing?.id ?? fallbackId,
    slug: bootstrap?.slug ?? existing?.slug ?? fallbackId,
    legacy_model_id: bootstrap?.legacyModelId ?? model.id,
    provider: bootstrap?.provider ?? model.provider,
    family_name: bootstrap?.familyName ?? model.display_name,
    public_display_name: bootstrap?.publicDisplayName ?? model.display_name,
    short_display_name: bootstrap?.shortDisplayName ?? model.display_name,
    color: bootstrap?.color ?? model.color,
    sort_order: bootstrap?.sortOrder ?? existing?.sort_order ?? getNextFamilySortOrder(db)
  };

  upsertModelFamily(db, family);
  return getModelFamilyById(db, family.id)!;
}

export function ensureReleaseForLegacyModel(
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
    ON CONFLICT(id) DO UPDATE SET
      release_name = excluded.release_name,
      release_slug = excluded.release_slug,
      openrouter_id = excluded.openrouter_id,
      provider = excluded.provider,
      metadata_json = excluded.metadata_json,
      release_status = 'active',
      retired_at = NULL
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

export function getOrCreateDefaultBenchmarkConfig(db: Database.Database): string {
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

export function insertConfigModelSnapshot(
  db: Database.Database,
  args: {
    configId: string;
    configModelId: string;
    family: ModelFamilyRow;
    releaseId: string;
    model: LegacyModelRow;
  }
): void {
  const pricing = getPricingSnapshot(args.family.id);

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
    ON CONFLICT(benchmark_config_id, family_id) DO UPDATE SET
      release_id = excluded.release_id,
      slot_order = excluded.slot_order,
      family_display_name_snapshot = excluded.family_display_name_snapshot,
      short_display_name_snapshot = excluded.short_display_name_snapshot,
      release_display_name_snapshot = excluded.release_display_name_snapshot,
      provider_snapshot = excluded.provider_snapshot,
      color_snapshot = excluded.color_snapshot,
      openrouter_id_snapshot = excluded.openrouter_id_snapshot,
      input_price_per_million_snapshot = excluded.input_price_per_million_snapshot,
      output_price_per_million_snapshot = excluded.output_price_per_million_snapshot
  `).run(
    args.configModelId,
    args.configId,
    args.family.id,
    args.releaseId,
    args.family.sort_order,
    args.family.public_display_name,
    args.family.short_display_name,
    args.model.display_name,
    args.model.provider,
    args.model.color,
    args.model.openrouter_id,
    pricing.input,
    pricing.output
  );
}
