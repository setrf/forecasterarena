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
        'benchmark_config_models',
        'agent_benchmark_identity',
        'api_costs'
      ]));
      expect(DEFAULT_TABLES).not.toContain('models');

      const decision = fixture.queries.createDecision({
        agent_id: fixture.agent.id,
        cohort_id: fixture.cohort.id,
        decision_week: 1,
        prompt_system: 'system',
        prompt_user: 'user',
        action: 'HOLD'
      });

      fixture.queries.createApiCost({
        model_id: fixture.modelId,
        agent_id: fixture.agent.id,
        family_id: fixture.agent.family_id,
        release_id: fixture.agent.release_id,
        benchmark_config_model_id: fixture.agent.benchmark_config_model_id,
        decision_id: decision.id,
        tokens_input: 10,
        tokens_output: 5,
        cost_usd: 0.01
      });

      const queries = buildQueries(false);
      const cohortRows = getRowsForTable(queries, 'cohorts', fixture.cohort.id, '2026-01-01', '2026-12-31');
      const agentRows = getRowsForTable(queries, 'agents', fixture.cohort.id, '2026-01-01', '2026-12-31');
      const familyRows = getRowsForTable(queries, 'model_families', fixture.cohort.id, '2026-01-01', '2026-12-31');
      const releaseRows = getRowsForTable(queries, 'model_releases', fixture.cohort.id, '2026-01-01', '2026-12-31');
      const configRows = getRowsForTable(queries, 'benchmark_configs', fixture.cohort.id, '2026-01-01', '2026-12-31');
      const configModelRows = getRowsForTable(queries, 'benchmark_config_models', fixture.cohort.id, '2026-01-01', '2026-12-31');
      const identityRows = getRowsForTable(queries, 'agent_benchmark_identity', fixture.cohort.id, '2026-01-01', '2026-12-31');
      const apiCostRows = getRowsForTable(queries, 'api_costs', fixture.cohort.id, '2026-01-01', '2026-12-31');

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
      expect(identityRows[0]).toMatchObject({
        agent_id: fixture.agent.id,
        cohort_id: fixture.cohort.id,
        legacy_model_id: fixture.modelId,
        family_id: fixture.agent.family_id,
        release_id: fixture.agent.release_id,
        benchmark_config_model_id: fixture.agent.benchmark_config_model_id
      });
      expect(apiCostRows[0]).toMatchObject({
        model_id: fixture.modelId,
        agent_id: fixture.agent.id,
        family_id: fixture.agent.family_id,
        release_id: fixture.agent.release_id,
        benchmark_config_model_id: fixture.agent.benchmark_config_model_id
      });
    } finally {
      await ctx.cleanup();
    }
  });
});
