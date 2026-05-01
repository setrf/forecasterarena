import { describe, expect, it } from 'vitest';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

describe('model identity query modules', () => {
  it('resolves model families by id, slug, and legacy model id', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const modelFamilies = await import('@/lib/db/queries/model-families');
      const allFamilies = modelFamilies.getAllModelFamilies();
      const activeFamilies = modelFamilies.getActiveModelFamilies();
      const openaiFamily = modelFamilies.getModelFamilyBySlug('openai-gpt');

      expect(allFamilies).toHaveLength(7);
      expect(activeFamilies).toHaveLength(7);
      expect(openaiFamily?.legacy_model_id).toBe('gpt-5.1');
      expect(modelFamilies.getModelFamilyById(openaiFamily!.id)?.id).toBe(openaiFamily?.id);
      expect(modelFamilies.getModelFamilyByLegacyModelId('gpt-5.1')?.id).toBe(openaiFamily?.id);
      expect(modelFamilies.resolveModelFamily(openaiFamily!.id)?.id).toBe(openaiFamily?.id);
      expect(modelFamilies.resolveModelFamily(openaiFamily!.slug)?.id).toBe(openaiFamily?.id);
      expect(modelFamilies.resolveModelFamily('gpt-5.1')?.id).toBe(openaiFamily?.id);
      expect(modelFamilies.resolveModelFamily('missing-family')).toBeUndefined();
    } finally {
      await ctx.cleanup();
    }
  });

  it('creates releases and benchmark configs through the stable query modules', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const modelFamilies = await import('@/lib/db/queries/model-families');
      const modelReleases = await import('@/lib/db/queries/model-releases');
      const benchmarkConfigs = await import('@/lib/db/queries/benchmark-configs');

      const family = modelFamilies.getModelFamilyBySlug('google-gemini');
      expect(family).toBeTruthy();

      const seededDefault = benchmarkConfigs.getDefaultBenchmarkConfig();
      expect(seededDefault).toBeTruthy();

      const currentRelease = modelReleases.getCurrentReleaseForFamily(family!.id);
      expect(currentRelease?.release_name).toBe('Gemini 3.1 Pro Preview');

      const releaseWithDefaults = modelReleases.createModelRelease({
        id: 'google-gemini--gemini-3.1-ultra',
        family_id: family!.id,
        release_name: 'Gemini 3.1 Ultra',
        release_slug: 'gemini-3.1-ultra',
        openrouter_id: 'google/gemini-3.1-ultra',
        provider: 'Google'
      });

      const releaseWithMetadata = modelReleases.createModelRelease({
        id: 'google-gemini--gemini-3.2-preview',
        family_id: family!.id,
        release_name: 'Gemini 3.2 Preview',
        release_slug: 'gemini-3.2-preview',
        openrouter_id: 'google/gemini-3.2-preview',
        provider: 'Google',
        metadata_json: JSON.stringify({ tier: 'preview' }),
        release_status: 'deprecated'
      });

      expect(modelReleases.getModelReleaseById(releaseWithDefaults.id)?.release_status).toBe('active');
      expect(modelReleases.getModelReleaseById(releaseWithMetadata.id)?.metadata_json).toContain('preview');
      expect(modelReleases.getModelReleasesByFamily(family!.id).map((release) => release.id)).toEqual(
        expect.arrayContaining([releaseWithDefaults.id, releaseWithMetadata.id])
      );

      const nonDefaultConfig = benchmarkConfigs.createBenchmarkConfig({
        version_name: 'candidate-config',
        methodology_version: 'v1',
        is_default_for_future_cohorts: false
      });

      const nonDefaultAssignment = benchmarkConfigs.createBenchmarkConfigModel({
        benchmark_config_id: nonDefaultConfig.id,
        family_id: family!.id,
        release_id: releaseWithDefaults.id,
        slot_order: 0,
        family_display_name_snapshot: family!.public_display_name,
        short_display_name_snapshot: family!.short_display_name,
        release_display_name_snapshot: releaseWithDefaults.release_name,
        provider_snapshot: releaseWithDefaults.provider,
        openrouter_id_snapshot: releaseWithDefaults.openrouter_id,
        input_price_per_million_snapshot: 2.5,
        output_price_per_million_snapshot: 10
      });

      expect(benchmarkConfigs.getBenchmarkConfigById(nonDefaultConfig.id)?.id).toBe(nonDefaultConfig.id);
      expect(benchmarkConfigs.getAllBenchmarkConfigs().map((config) => config.id)).toEqual(
        expect.arrayContaining([seededDefault!.id, nonDefaultConfig.id])
      );
      expect(benchmarkConfigs.getAllBenchmarkConfigs(1)).toHaveLength(1);
      expect(benchmarkConfigs.getBenchmarkConfigModels(nonDefaultConfig.id).map((row) => row.id)).toContain(nonDefaultAssignment.id);
      expect(benchmarkConfigs.getBenchmarkConfigModelByFamily(nonDefaultConfig.id, family!.id)?.id).toBe(nonDefaultAssignment.id);
      expect(benchmarkConfigs.getDefaultBenchmarkConfig()?.id).toBe(seededDefault?.id);

      const defaultConfig = benchmarkConfigs.createBenchmarkConfig({
        version_name: 'promoted-config',
        methodology_version: 'v1',
        notes: 'Promoted config',
        created_by: 'vitest',
        is_default_for_future_cohorts: true
      });

      benchmarkConfigs.createBenchmarkConfigModel({
        benchmark_config_id: defaultConfig.id,
        family_id: family!.id,
        release_id: releaseWithMetadata.id,
        slot_order: 0,
        family_display_name_snapshot: family!.public_display_name,
        short_display_name_snapshot: family!.short_display_name,
        release_display_name_snapshot: releaseWithMetadata.release_name,
        provider_snapshot: releaseWithMetadata.provider,
        color_snapshot: family!.color,
        openrouter_id_snapshot: releaseWithMetadata.openrouter_id,
        input_price_per_million_snapshot: 3,
        output_price_per_million_snapshot: 12
      });

      expect(benchmarkConfigs.getDefaultBenchmarkConfig()?.id).toBe(defaultConfig.id);
      expect(modelReleases.getCurrentReleaseForFamily(family!.id)?.id).toBe(releaseWithMetadata.id);

      benchmarkConfigs.setDefaultBenchmarkConfig(seededDefault!.id);
      expect(benchmarkConfigs.getDefaultBenchmarkConfig()?.id).toBe(seededDefault?.id);
      expect(modelReleases.getCurrentReleaseForFamily(family!.id)?.id).toBe(currentRelease?.id);
    } finally {
      await ctx.cleanup();
    }
  });

  it('backfills frozen lineage for legacy rows that were inserted without family metadata', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const foundation = await import('@/lib/catalog/foundation');
      const dbModule = await import('@/lib/db');
      const views = await import('@/lib/db/views');
      const agents = await import('@/lib/db/queries/agents');
      const db = dbModule.getDb();

      db.prepare(`
        INSERT INTO models (id, openrouter_id, display_name, provider, color, is_active)
        VALUES (?, ?, ?, ?, ?, 0)
      `).run(
        'legacy-custom',
        'custom/legacy-model',
        'Legacy Custom',
        'CustomAI',
        '#111111'
      );

      db.pragma('foreign_keys = OFF');
      db.exec('DROP TRIGGER IF EXISTS cohorts_require_benchmark_config_insert');
      db.exec('DROP TRIGGER IF EXISTS cohorts_require_benchmark_config_update');
      db.exec('DROP TRIGGER IF EXISTS agents_require_frozen_lineage_insert');
      db.exec('DROP TRIGGER IF EXISTS agents_require_frozen_lineage_update');
      db.exec('DROP VIEW IF EXISTS decision_benchmark_identity_v');
      db.exec('DROP VIEW IF EXISTS agent_benchmark_identity_v');
      db.exec('ALTER TABLE cohorts RENAME TO cohorts_strict_backup');
      db.exec(`
        CREATE TABLE cohorts (
          id TEXT PRIMARY KEY,
          cohort_number INTEGER NOT NULL UNIQUE,
          started_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          completed_at TEXT,
          methodology_version TEXT NOT NULL DEFAULT 'v1',
          benchmark_config_id TEXT,
          initial_balance REAL NOT NULL DEFAULT 10000.00,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (methodology_version) REFERENCES methodology_versions(version),
          FOREIGN KEY (benchmark_config_id) REFERENCES benchmark_configs(id)
        )
      `);
      db.exec('ALTER TABLE agents RENAME TO agents_strict_backup');
      db.exec(`
        CREATE TABLE agents (
          id TEXT PRIMARY KEY,
          cohort_id TEXT NOT NULL,
          model_id TEXT NOT NULL,
          family_id TEXT,
          release_id TEXT,
          benchmark_config_model_id TEXT,
          cash_balance REAL NOT NULL DEFAULT 10000.00,
          total_invested REAL NOT NULL DEFAULT 0.00,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cohort_id) REFERENCES cohorts(id),
          FOREIGN KEY (model_id) REFERENCES models(id),
          FOREIGN KEY (family_id) REFERENCES model_families(id),
          FOREIGN KEY (release_id) REFERENCES model_releases(id),
          FOREIGN KEY (benchmark_config_model_id) REFERENCES benchmark_config_models(id),
          UNIQUE(cohort_id, model_id)
        )
      `);
      db.pragma('foreign_keys = ON');
      views.initializeViews(db);

      const cohortId = 'cohort-legacy-custom';
      db.prepare(`
        INSERT INTO cohorts (
          id,
          cohort_number,
          started_at,
          status,
          methodology_version,
          benchmark_config_id,
          initial_balance
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        cohortId,
        1,
        '2025-01-05T00:00:00.000Z',
        'active',
        'v1',
        null,
        10000
      );
      db.prepare(`
        INSERT INTO agents (
          id,
          cohort_id,
          model_id,
          cash_balance,
          total_invested,
          status
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        'agent-legacy-custom',
        cohortId,
        'legacy-custom',
        10000,
        0,
        'active'
      );

      foundation.ensureModelIdentityFoundation(db);
      views.initializeViews(db);

      const [agent] = agents.getAgentsWithModelsByCohort(cohortId);
      expect(agent?.family_id).toBe('legacy-custom');
      expect(agent?.release_id).toBe('legacy-custom--legacy-custom');
      expect(agent?.benchmark_config_model_id).toBe(`benchmark-config-backfill-${cohortId}--legacy-custom`);
      expect(agent?.model.family_id).toBe('legacy-custom');
      expect(agent?.model.family_slug).toBe('legacy-custom');
      expect(agent?.model.display_name).toBe('Legacy Custom');
      expect(agent?.model.short_display_name).toBe('Legacy Custom');
      expect(agent?.model.release_name).toBe('Legacy Custom');
      expect(agent?.model.release_slug).toBe('legacy-custom');
      expect(agent?.model.openrouter_id).toBe('custom/legacy-model');
      expect(agent?.model.provider).toBe('CustomAI');
      expect(agent?.model.input_price_per_million).toBe(2);
      expect(agent?.model.output_price_per_million).toBe(8);
      expect(agents.getAgentByCohortAndModel(cohortId, 'legacy-custom')?.id).toBe('agent-legacy-custom');
    } finally {
      await ctx.cleanup();
    }
  });

  it('creates agents from family-only config slots and handles cohorts without a default config', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const dbModule = await import('@/lib/db');
      const cohorts = await import('@/lib/db/queries/cohorts');
      const agents = await import('@/lib/db/queries/agents');
      const modelReleases = await import('@/lib/db/queries/model-releases');
      const benchmarkConfigs = await import('@/lib/db/queries/benchmark-configs');
      const db = dbModule.getDb();

      db.prepare(`
        INSERT INTO models (id, openrouter_id, display_name, provider, color, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(
        'custom-family',
        'custom/family-default',
        'Custom Family',
        'CustomAI',
        '#222222'
      );

      db.prepare(`
        INSERT INTO model_families (
          id,
          slug,
          legacy_model_id,
          family_name,
          public_display_name,
          short_display_name,
          provider,
          color,
          status,
          sort_order
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'active', 99)
      `).run(
        'custom-family',
        'custom-family',
        'Custom Family',
        'Custom Family',
        'Custom',
        'CustomAI',
        '#222222'
      );

      const release = modelReleases.createModelRelease({
        id: 'custom-family--v1',
        family_id: 'custom-family',
        release_name: 'Custom Family v1',
        release_slug: 'custom-family-v1',
        openrouter_id: 'custom/family-default',
        provider: 'CustomAI'
      });

      const config = benchmarkConfigs.createBenchmarkConfig({
        version_name: 'family-only-config',
        methodology_version: 'v1',
        is_default_for_future_cohorts: false
      });

      const configModel = benchmarkConfigs.createBenchmarkConfigModel({
        benchmark_config_id: config.id,
        family_id: 'custom-family',
        release_id: release.id,
        slot_order: 0,
        family_display_name_snapshot: 'Custom Family',
        short_display_name_snapshot: 'Custom',
        release_display_name_snapshot: release.release_name,
        provider_snapshot: release.provider,
        color_snapshot: '#222222',
        openrouter_id_snapshot: release.openrouter_id,
        input_price_per_million_snapshot: 1,
        output_price_per_million_snapshot: 2
      });

      const configuredCohort = cohorts.createCohort(config.id);
      const configuredAgents = agents.createAgentsForCohort(configuredCohort.id, config.id);
      expect(configuredAgents).toHaveLength(1);
      expect(configuredAgents[0]?.model_id).toBe('custom-family');

      db.prepare('UPDATE cohorts SET started_at = ? WHERE id = ?').run(
        '2030-01-01T00:00:00.000Z',
        configuredCohort.id
      );
      db.prepare('UPDATE benchmark_configs SET is_default_for_future_cohorts = 0').run();
      expect(() => cohorts.createCohort(null)).toThrow(
        /No default benchmark config is configured for cohort creation/i
      );
      db.prepare(`
        INSERT INTO cohorts (
          id,
          cohort_number,
          started_at,
          methodology_version,
          benchmark_config_id
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        'cohort-without-default',
        2,
        '2030-01-07T00:00:00.000Z',
        'v1',
        config.id
      );

      const fallbackAgents = agents.createAgentsForCohort('cohort-without-default', null);
      expect(fallbackAgents).toHaveLength(1);
      expect(fallbackAgents[0]?.benchmark_config_model_id).toBe(configModel.id);
    } finally {
      await ctx.cleanup();
    }
  });
});
