import type Database from 'better-sqlite3';

import type { DbMigration } from '@/lib/db/migrations/types';

const LATEST_LINEUP_CONFIG_ID = 'lineup-2026-05-latest-exact';
const LATEST_LINEUP_VERSION_NAME = 'lineup-2026-05-latest-exact';

const LATEST_LINEUP = [
  {
    family_id: 'openai-gpt',
    release_id: 'openai-gpt--gpt-5.5',
    release_name: 'GPT-5.5',
    release_slug: 'gpt-5.5',
    openrouter_id: 'openai/gpt-5.5',
    provider: 'OpenAI',
    input_price_per_million: 5,
    output_price_per_million: 30
  },
  {
    family_id: 'google-gemini',
    release_id: 'google-gemini--gemini-3.1-pro-preview',
    release_name: 'Gemini 3.1 Pro Preview',
    release_slug: 'gemini-3.1-pro-preview',
    openrouter_id: 'google/gemini-3.1-pro-preview',
    provider: 'Google',
    input_price_per_million: 2,
    output_price_per_million: 12
  },
  {
    family_id: 'xai-grok',
    release_id: 'xai-grok--grok-4.3',
    release_name: 'Grok 4.3',
    release_slug: 'grok-4.3',
    openrouter_id: 'x-ai/grok-4.3',
    provider: 'xAI',
    input_price_per_million: 1.25,
    output_price_per_million: 2.5
  },
  {
    family_id: 'anthropic-claude-opus',
    release_id: 'anthropic-claude-opus--claude-opus-4.7',
    release_name: 'Claude Opus 4.7',
    release_slug: 'claude-opus-4.7',
    openrouter_id: 'anthropic/claude-opus-4.7',
    provider: 'Anthropic',
    input_price_per_million: 5,
    output_price_per_million: 25
  },
  {
    family_id: 'deepseek-v3',
    release_id: 'deepseek-v3--deepseek-v4-pro',
    release_name: 'DeepSeek V4 Pro',
    release_slug: 'deepseek-v4-pro',
    openrouter_id: 'deepseek/deepseek-v4-pro',
    provider: 'DeepSeek',
    input_price_per_million: 0.435,
    output_price_per_million: 0.87
  },
  {
    family_id: 'moonshot-kimi',
    release_id: 'moonshot-kimi--kimi-k2.6',
    release_name: 'Kimi K2.6',
    release_slug: 'kimi-k2.6',
    openrouter_id: 'moonshotai/kimi-k2.6',
    provider: 'Moonshot AI',
    input_price_per_million: 0.74,
    output_price_per_million: 3.49
  },
  {
    family_id: 'alibaba-qwen',
    release_id: 'alibaba-qwen--qwen3.6-max-preview',
    release_name: 'Qwen 3.6 Max Preview',
    release_slug: 'qwen3.6-max-preview',
    openrouter_id: 'qwen/qwen3.6-max-preview',
    provider: 'Alibaba',
    input_price_per_million: 1.04,
    output_price_per_million: 6.24
  }
] as const;

function hasColumns(
  db: Database.Database,
  tableName: string,
  columnNames: string[]
): boolean {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  const existingColumns = new Set(rows.map((row) => row.name));
  return columnNames.every((columnName) => existingColumns.has(columnName));
}

function hasLatestLineupSchema(db: Database.Database): boolean {
  return (
    hasColumns(db, 'model_families', [
      'id',
      'public_display_name',
      'short_display_name',
      'color',
      'sort_order'
    ]) &&
    hasColumns(db, 'model_releases', [
      'id',
      'family_id',
      'release_name',
      'release_slug',
      'openrouter_id',
      'provider',
      'metadata_json',
      'release_status',
      'retired_at'
    ]) &&
    hasColumns(db, 'benchmark_configs', [
      'id',
      'version_name',
      'methodology_version',
      'notes',
      'created_by',
      'is_default_for_future_cohorts'
    ]) &&
    hasColumns(db, 'benchmark_config_models', [
      'id',
      'benchmark_config_id',
      'family_id',
      'release_id',
      'slot_order',
      'family_display_name_snapshot',
      'short_display_name_snapshot',
      'release_display_name_snapshot',
      'provider_snapshot',
      'color_snapshot',
      'openrouter_id_snapshot',
      'input_price_per_million_snapshot',
      'output_price_per_million_snapshot'
    ])
  );
}

function insertOrUpdateRelease(
  db: Database.Database,
  release: typeof LATEST_LINEUP[number]
): void {
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
    release.release_id,
    release.family_id,
    release.release_name,
    release.release_slug,
    release.openrouter_id,
    release.provider,
    JSON.stringify({
      default_input_price_per_million: release.input_price_per_million,
      default_output_price_per_million: release.output_price_per_million,
      created_via: 'migration:012_latest_model_lineup',
      notes: 'Latest exact OpenRouter model lineup for future v2 cohorts.'
    })
  );
}

function createOrUpdateLatestConfig(db: Database.Database): void {
  db.prepare(`
    INSERT INTO benchmark_configs (
      id,
      version_name,
      methodology_version,
      notes,
      created_by,
      is_default_for_future_cohorts
    ) VALUES (?, ?, 'v2', ?, 'system:migration', 1)
    ON CONFLICT(id) DO UPDATE SET
      version_name = excluded.version_name,
      methodology_version = excluded.methodology_version,
      notes = excluded.notes,
      created_by = excluded.created_by
  `).run(
    LATEST_LINEUP_CONFIG_ID,
    LATEST_LINEUP_VERSION_NAME,
    'Latest exact OpenRouter lineup promoted for future cohorts. Existing cohorts retain frozen lineage.'
  );
}

function createOrUpdateLineupAssignments(db: Database.Database): void {
  const familyStatement = db.prepare(`
    SELECT public_display_name, short_display_name, color, sort_order
    FROM model_families
    WHERE id = ?
  `);

  const upsertAssignment = db.prepare(`
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
  `);

  for (const release of LATEST_LINEUP) {
    const family = familyStatement.get(release.family_id) as {
      public_display_name: string;
      short_display_name: string;
      color: string | null;
      sort_order: number;
    } | undefined;

    if (!family) {
      throw new Error(`Missing model family for latest lineup: ${release.family_id}`);
    }

    upsertAssignment.run(
      `${LATEST_LINEUP_CONFIG_ID}--${release.family_id}`,
      LATEST_LINEUP_CONFIG_ID,
      release.family_id,
      release.release_id,
      family.sort_order,
      family.public_display_name,
      family.short_display_name,
      release.release_name,
      release.provider,
      family.color,
      release.openrouter_id,
      release.input_price_per_million,
      release.output_price_per_million
    );
  }
}

export const latestModelLineupMigration: DbMigration = {
  id: '012_latest_model_lineup',
  description: 'Promotes the May 2026 latest exact model lineup for future cohorts.',
  apply(db: Database.Database) {
    if (!hasLatestLineupSchema(db)) {
      return;
    }

    for (const release of LATEST_LINEUP) {
      insertOrUpdateRelease(db, release);
    }

    createOrUpdateLatestConfig(db);
    createOrUpdateLineupAssignments(db);

    db.prepare(`
      UPDATE benchmark_configs
      SET is_default_for_future_cohorts = CASE WHEN id = ? THEN 1 ELSE 0 END
    `).run(LATEST_LINEUP_CONFIG_ID);

    db.prepare('DELETE FROM performance_chart_cache').run();
  }
};
