import { describe, expect, it } from 'vitest';
import { createSingleAgentFixture } from '@/tests/helpers/db-fixtures';
import { createIsolatedTestContext } from '@/tests/helpers/test-context';

async function withCohortRoutes(
  run: (fixture: {
    db: ReturnType<typeof import('@/lib/db')['getDb']>;
    queries: typeof import('@/lib/db/queries');
    cohortRoute: typeof import('@/app/api/cohorts/[id]/route');
    agentRoute: typeof import('@/app/api/cohorts/[id]/models/[modelId]/route');
    cohort: Awaited<ReturnType<typeof createSingleAgentFixture>>['cohort'];
    agent: Awaited<ReturnType<typeof createSingleAgentFixture>>['agent'];
    modelId: string;
  }) => Promise<void>
) {
  const ctx = await createIsolatedTestContext({ nodeEnv: 'test' });

  try {
    const fixture = await createSingleAgentFixture();
    const cohortRoute = await import('@/app/api/cohorts/[id]/route');
    const agentRoute = await import('@/app/api/cohorts/[id]/models/[modelId]/route');

    await run({
      db: fixture.db,
      queries: fixture.queries,
      cohortRoute,
      agentRoute,
      cohort: fixture.cohort,
      agent: fixture.agent,
      modelId: fixture.modelId
    });
  } finally {
    await ctx.cleanup();
  }
}

describe('cohort routes', () => {
  it('returns cohort detail for an existing cohort', async () => {
    await withCohortRoutes(async ({ cohort, cohortRoute }) => {
      const response = await cohortRoute.GET(
        new Request(`http://localhost/api/cohorts/${cohort.id}`) as any,
        { params: Promise.resolve({ id: cohort.id }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cohort.id).toBe(cohort.id);
      expect(data.agents).toHaveLength(1);
      expect(data.equity_curves).toBeTypeOf('object');
      expect(data.updated_at).toBeTypeOf('string');
    });
  });

  it('returns 404 for a missing cohort', async () => {
    await withCohortRoutes(async ({ cohortRoute }) => {
      const response = await cohortRoute.GET(
        new Request('http://localhost/api/cohorts/missing') as any,
        { params: Promise.resolve({ id: 'missing' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Cohort not found');
    });
  });

  it('returns agent cohort detail for an active model in the cohort', async () => {
    await withCohortRoutes(async ({ cohort, modelId, agentRoute }) => {
      const response = await agentRoute.GET(
        new Request(`http://localhost/api/cohorts/${cohort.id}/models/${modelId}`) as any,
        { params: Promise.resolve({ id: cohort.id, modelId }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cohort.id).toBe(cohort.id);
      expect(data.model.id).toBe(modelId);
      expect(data.agent.total_agents).toBe(1);
      expect(data.positions).toEqual([]);
      expect(data.closed_positions).toEqual([]);
    });
  });

  it('returns 404 when the model exists but is not active in the cohort', async () => {
    await withCohortRoutes(async ({ db, cohort, modelId, agentRoute }) => {
      const otherModel = db.prepare(`
        SELECT id
        FROM models
        WHERE id != ?
        ORDER BY id ASC
        LIMIT 1
      `).get(modelId) as { id: string };

      const response = await agentRoute.GET(
        new Request(`http://localhost/api/cohorts/${cohort.id}/models/${otherModel.id}`) as any,
        { params: Promise.resolve({ id: cohort.id, modelId: otherModel.id }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Agent not found in this cohort');
    });
  });
});
