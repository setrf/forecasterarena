export async function createTestBenchmarkConfigForLegacyModels(legacyModelIds: string[]) {
  const [
    benchmarkConfigs,
    modelFamilies,
    modelReleases
  ] = await Promise.all([
    import('@/lib/db/queries/benchmark-configs'),
    import('@/lib/db/queries/model-families'),
    import('@/lib/db/queries/model-releases')
  ]);

  const config = benchmarkConfigs.createBenchmarkConfig({
    version_name: `test-config-${Date.now()}-${legacyModelIds.join('-')}`,
    methodology_version: 'v1',
    notes: 'Test-only benchmark config',
    created_by: 'vitest',
    is_default_for_future_cohorts: true
  });

  legacyModelIds.forEach((legacyModelId, index) => {
    const family = modelFamilies.getModelFamilyByLegacyModelId(legacyModelId);
    if (!family) {
      throw new Error(`Missing model family for legacy model id: ${legacyModelId}`);
    }

    const release = modelReleases.getCurrentReleaseForFamily(family.id)
      ?? modelReleases.getModelReleasesByFamily(family.id)[0];

    if (!release) {
      throw new Error(`Missing model release for family: ${family.id}`);
    }

    benchmarkConfigs.createBenchmarkConfigModel({
      benchmark_config_id: config.id,
      family_id: family.id,
      release_id: release.id,
      slot_order: index,
      family_display_name_snapshot: family.public_display_name,
      short_display_name_snapshot: family.short_display_name,
      release_display_name_snapshot: release.release_name,
      provider_snapshot: release.provider,
      color_snapshot: family.color,
      openrouter_id_snapshot: release.openrouter_id,
      input_price_per_million_snapshot: 0,
      output_price_per_million_snapshot: 0
    });
  });

  return config;
}

export async function createSingleAgentFixture() {
  const queries = await import('@/lib/db/queries');
  const dbModule = await import('@/lib/db');
  const db = dbModule.getDb();

  const firstModel = db.prepare(`
    SELECT id FROM models
    ORDER BY id ASC
    LIMIT 1
  `).get() as { id: string };

  db.prepare(`
    UPDATE models
    SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END
  `).run(firstModel.id);

  const benchmarkConfig = await createTestBenchmarkConfigForLegacyModels([firstModel.id]);
  const cohort = queries.createCohort(benchmarkConfig.id);
  const [agent] = queries.createAgentsForCohort(cohort.id, benchmarkConfig.id);

  return {
    queries,
    dbModule,
    db,
    cohort,
    agent,
    legacyModelId: firstModel.id
  };
}
