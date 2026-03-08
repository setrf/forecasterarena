import { describe, expect, it } from 'vitest';
import { createSingleAgentFixture } from '@/tests/helpers/db-fixtures';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

describe('admin export lineage queries', () => {
  it('exports frozen cohort lineup metadata alongside legacy model rows', async () => {
    const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

    try {
      const fixture = await createSingleAgentFixture();
      const { buildQueries, getRowsForTable } = await import('@/lib/application/admin-export/queries');
      const { DEFAULT_TABLES } = await import('@/lib/application/admin-export/constants');

      expect(DEFAULT_TABLES).toEqual(expect.arrayContaining([
        'model_families',
        'model_releases',
        'benchmark_configs',
        'benchmark_config_models'
      ]));

      const queries = buildQueries(false);
      const cohortRows = getRowsForTable(queries, 'cohorts', fixture.cohort.id, '2026-01-01', '2026-12-31');
      const agentRows = getRowsForTable(queries, 'agents', fixture.cohort.id, '2026-01-01', '2026-12-31');
      const familyRows = getRowsForTable(queries, 'model_families', fixture.cohort.id, '2026-01-01', '2026-12-31');
      const releaseRows = getRowsForTable(queries, 'model_releases', fixture.cohort.id, '2026-01-01', '2026-12-31');
      const configRows = getRowsForTable(queries, 'benchmark_configs', fixture.cohort.id, '2026-01-01', '2026-12-31');
      const configModelRows = getRowsForTable(queries, 'benchmark_config_models', fixture.cohort.id, '2026-01-01', '2026-12-31');

      expect(cohortRows[0]).toMatchObject({
        id: fixture.cohort.id,
        benchmark_config_id: expect.any(String)
      });
      expect(agentRows[0]).toMatchObject({
        id: fixture.agent.id,
        model_id: fixture.modelId,
        family_id: expect.any(String),
        release_id: expect.any(String),
        benchmark_config_model_id: expect.any(String)
      });
      expect(familyRows).toHaveLength(1);
      expect(releaseRows).toHaveLength(1);
      expect(configRows).toHaveLength(1);
      expect(configModelRows).toHaveLength(1);
    } finally {
      await ctx.cleanup();
    }
  });
});
